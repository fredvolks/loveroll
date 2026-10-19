-- LoveRoll opt-in Web Push (iOS home-screen PWA, Android web PWA).
-- Never include intimate or challenge details in notifications.
create table if not exists public.love_push_preferences(
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default false,
 weekly boolean not null default true,
 invitation boolean not null default true,
 monthly boolean not null default true,
 special boolean not null default true,
 updated_at timestamptz not null default now()
);
create table if not exists public.love_push_subscriptions(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null,
 p256dh text not null,
 auth_key text not null,
 user_agent text,
 created_at timestamptz not null default now(),
 unique(user_id,endpoint),
 constraint push_endpoint_https check(endpoint like 'https://%' and length(endpoint)<=2048),
 constraint push_cryptokey_lengths check(length(p256dh) between 40 and 300 and length(auth_key) between 12 and 200)
);
create table if not exists public.love_push_outbox(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 event_key text not null,
 kind text not null check(kind in ('weekly','invitation','monthly','special')),
 title text not null,
 body text not null,
 due_at timestamptz not null default now(),
 sent_at timestamptz,
 attempts integer not null default 0,
 created_at timestamptz not null default now(),
 unique(user_id,event_key)
);
create index if not exists love_push_outbox_ready on public.love_push_outbox(due_at)
 where sent_at is null;
create index if not exists love_push_subscriptions_user on public.love_push_subscriptions(user_id);
alter table public.love_push_preferences enable row level security;
alter table public.love_push_subscriptions enable row level security;
alter table public.love_push_outbox enable row level security;
drop policy if exists love_push_preferences_own on public.love_push_preferences;
create policy love_push_preferences_own on public.love_push_preferences
 for all to authenticated using (user_id=(select auth.uid()))
 with check(user_id=(select auth.uid()));
drop policy if exists love_push_subscriptions_own on public.love_push_subscriptions;
create policy love_push_subscriptions_own on public.love_push_subscriptions
 for all to authenticated using (user_id=(select auth.uid()))
 with check(user_id=(select auth.uid()));
-- Read-only inbox; all inserts exclusively originate on the server.
drop policy if exists love_push_outbox_read on public.love_push_outbox;
create policy love_push_outbox_read on public.love_push_outbox for select to authenticated
 using(user_id=(select auth.uid()));
revoke all on public.love_push_outbox from anon,authenticated;
grant select on public.love_push_outbox to authenticated;
grant select,insert,update,delete on public.love_push_preferences,public.love_push_subscriptions to authenticated;
revoke all on public.love_push_subscriptions,public.love_push_preferences from anon;

-- Token held in encrypted database Vault, never committed in source code.
do $$begin
 if not exists (select 1 from vault.secrets where name='loveroll_push_dispatch_token') then
  perform vault.create_secret(encode(gen_random_bytes(32),'hex'),'loveroll_push_dispatch_token');
 end if;
end$$;

create or replace function public.love_push_verify_dispatch(p_token text)
returns boolean language sql stable security definer set search_path to ''
as $$
 select p_token is not null and exists(
  select 1 from vault.decrypted_secrets
  where name='loveroll_push_dispatch_token'
  and decrypted_secret=p_token
 );
$$;
revoke all on function public.love_push_verify_dispatch(text) from public,anon,authenticated;
grant execute on function public.love_push_verify_dispatch(text) to service_role;

create or replace function public.love_push_bootstrap_keys(p_public text,p_private text)
returns void language plpgsql security definer set search_path to ''
as $$
begin
 if length(coalesce(p_public,''))<80 or length(coalesce(p_private,''))<35
 then raise exception 'Clés VAPID invalides'; end if;
 if not exists(select 1 from vault.secrets where name='loveroll_push_vapid_public') then
  perform vault.create_secret(p_public,'loveroll_push_vapid_public');
  perform vault.create_secret(p_private,'loveroll_push_vapid_private');
 end if;
end;$$;
revoke all on function public.love_push_bootstrap_keys(text,text) from public,anon,authenticated;
grant execute on function public.love_push_bootstrap_keys(text,text) to service_role;

create or replace function public.love_push_server_keys()
returns jsonb language sql stable security definer set search_path to ''
as $$
 select jsonb_build_object(
 'public',(select decrypted_secret from vault.decrypted_secrets where name='loveroll_push_vapid_public'),
 'private',(select decrypted_secret from vault.decrypted_secrets where name='loveroll_push_vapid_private')
 );
$$;
revoke all on function public.love_push_server_keys() from public,anon,authenticated;
grant execute on function public.love_push_server_keys() to service_role;

create or replace function public.love_push_public_key()
returns text language sql stable security definer set search_path to ''
as $$
 select decrypted_secret from vault.decrypted_secrets where name='loveroll_push_vapid_public' limit 1;
$$;
revoke all on function public.love_push_public_key() from public,anon;
grant execute on function public.love_push_public_key() to authenticated;

-- Only schedule generic notifications if the user opted in.
create or replace function public.love_push_on_invite_accept()
returns trigger language plpgsql security definer set search_path to ''
as $$
begin
 if new.accepted_at is not null and old.accepted_at is null then
 insert into public.love_push_outbox(user_id,event_key,kind,title,body)
 select new.created_by,'accepted:'||new.id,'invitation',
 'LoveRoll ❤️ Votre invitation est acceptée',
 'Votre espace à deux est prêt. Ouvrez LoveRoll pour vous retrouver.'
 from public.love_push_preferences p where p.user_id=new.created_by
 and p.enabled and p.invitation
 on conflict(user_id,event_key) do nothing;
 end if;
 return new;
end;$$;
drop trigger if exists love_push_invitation_accepted on public.couple_invitations;
create trigger love_push_invitation_accepted after update of accepted_at
 on public.couple_invitations for each row execute function public.love_push_on_invite_accept();

create or replace function public.love_push_enqueue_weekly()
returns integer language plpgsql security definer set search_path to ''
as $$
declare n integer;
begin
 if extract(isodow from now() at time zone 'America/Toronto')<>1
 or (now() at time zone 'America/Toronto')::time not between time '09:00' and time '09:20'
 then return 0; end if;
 insert into public.love_push_outbox(user_id,event_key,kind,title,body)
 select p.user_id,'weekly:'||to_char(now() at time zone 'America/Toronto','IYYY-IW'),
 'weekly','LoveRoll 🎲 Votre dé hebdomadaire est prêt',
 'Votre nouveau rituel vous attend dans LoveRoll.'
 from public.love_push_preferences p
 where p.enabled and p.weekly
 and exists(
  select 1 from public.couple_members m where m.user_id=p.user_id
  and (select count(*) from public.couple_members m2 where m2.couple_id=m.couple_id)=2
 )
 on conflict (user_id,event_key) do nothing;
 get diagnostics n=row_count;
 return n;
end;$$;
revoke all on function public.love_push_enqueue_weekly() from public,anon,authenticated;
grant execute on function public.love_push_enqueue_weekly() to service_role;

-- Safety: client cannot write to notifications outbox or see others' push tokens.
