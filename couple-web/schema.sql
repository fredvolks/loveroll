-- Dés à Deux: separate Supabase project only, never run against Mon Wallet.
-- V1 paired identity + single-writer authenticated game rolls and encrypted shared diary.
create extension if not exists pgcrypto;
create schema if not exists couple_private;

create table public.couple_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check (char_length(trim(display_name)) between 1 and 80),
 created_at timestamptz not null default now()
);
create table public.couples (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 journal_salt text not null default encode(decode(replace(gen_random_uuid()::text,'-',''),'hex'),'base64')
);
create table public.couple_members (
 couple_id uuid not null references public.couples(id) on delete cascade,
 user_id uuid not null unique references auth.users(id) on delete cascade,
 joined_at timestamptz not null default now(),
 primary key(couple_id,user_id)
);
create table public.couple_invitations (
 id uuid primary key default gen_random_uuid(),
 couple_id uuid not null references public.couples(id) on delete cascade,
 invited_email text not null,
 token_hash text not null unique,
 expires_at timestamptz not null default now()+interval '7 days',
 accepted_at timestamptz,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 check (invited_email=lower(trim(invited_email)))
);
create table public.couple_rolls (
 id uuid primary key default gen_random_uuid(),
 couple_id uuid not null references public.couples(id) on delete cascade,
 kind text not null check (kind in
 ('weekly','monthly_activity','monthly_host','monthly_restaurant','advent')),
 key text not null,
 actor uuid not null references auth.users(id),
 face integer not null check(face between 1 and 20),
 created_at timestamptz not null default now(),
 unique(couple_id,kind,key)
);
create table public.couple_sessions (
 id uuid primary key default gen_random_uuid(),
 couple_id uuid not null references public.couples(id) on delete cascade,
 opened_by uuid not null references auth.users(id),
 started_at timestamptz not null default now(),
 counted boolean not null default false,
 finished_at timestamptz
);
create unique index single_active_couple_session on public.couple_sessions(couple_id)
 where finished_at is null;
create table public.couple_personal_rolls (
 session_id uuid not null references public.couple_sessions(id) on delete cascade,
 user_id uuid not null references auth.users(id),
 face smallint not null check(face between 1 and 6),
 created_at timestamptz not null default now(),
 primary key(session_id,user_id)
);
create table public.couple_challenges (
 id uuid primary key default gen_random_uuid(),
 session_id uuid not null references public.couple_sessions(id) on delete cascade,
 couple_id uuid not null references public.couples(id) on delete cascade,
 offered_by uuid not null references auth.users(id),
 recipient uuid not null references auth.users(id),
 category text not null check(category in ('SENSUEL','COQUIN','SEXUEL')),
 face smallint not null check(face between 1 and 20),
 status text not null default 'proposed'
   check(status in ('proposed','accepted','passed','completed')),
 created_at timestamptz not null default now(),
 unique(session_id,recipient,category,face),
 check(offered_by <> recipient)
);
create table public.couple_advent (
 couple_id uuid not null references public.couples(id) on delete cascade,
 year smallint not null,
 day smallint not null check(day between 1 and 25),
 opened_by uuid not null references auth.users(id),
 performed_by uuid references auth.users(id),
 completed boolean not null default false,
 opened_at timestamptz not null default now(),
 primary key(couple_id,year,day)
);
create table public.couple_intimacy (
 id uuid primary key default gen_random_uuid(),
 couple_id uuid not null references public.couples(id) on delete cascade,
 author_id uuid not null references auth.users(id),
 happened_on date not null,
 ciphertext text not null check(length(ciphertext) between 20 and 30000),
 created_at timestamptz not null default now()
);
create table public.couple_feedback (
 session_id uuid not null references public.couple_sessions(id) on delete cascade,
 couple_id uuid not null references public.couples(id) on delete cascade,
 author_id uuid not null references auth.users(id),
 ciphertext text not null check(length(ciphertext) between 20 and 30000),
 updated_at timestamptz not null default now(),
 primary key(session_id,author_id)
);
create table public.couple_events (
 id bigint generated always as identity primary key,
 couple_id uuid not null references public.couples(id) on delete cascade,
 event_type text not null check(event_type in ('roll','session','challenge','feedback','journal','advent','member')),
 actor_id uuid not null references auth.users(id),
 happened_at timestamptz not null default now(),
 title text not null default ''
);

-- RLS: no anonymous or other couple access, immutable public game events.
create or replace function couple_private.is_member(p_couple uuid)
returns boolean language sql stable security definer
set search_path = '' as $$
 select exists(select 1 from public.couple_members m
  where m.couple_id=p_couple and m.user_id=(select auth.uid()))
$$;
revoke all on function couple_private.is_member(uuid) from public,anon;
grant usage on schema couple_private to authenticated;
grant execute on function couple_private.is_member(uuid) to authenticated;

alter table public.couple_profiles enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.couple_invitations enable row level security;
alter table public.couple_rolls enable row level security;
alter table public.couple_sessions enable row level security;
alter table public.couple_personal_rolls enable row level security;
alter table public.couple_challenges enable row level security;
alter table public.couple_advent enable row level security;
alter table public.couple_intimacy enable row level security;
alter table public.couple_feedback enable row level security;
alter table public.couple_events enable row level security;
create policy profiles_read on public.couple_profiles for select to authenticated
 using (id=(select auth.uid()) or exists(
 select 1 from public.couple_members a join public.couple_members b on a.couple_id=b.couple_id
 where a.user_id=(select auth.uid()) and b.user_id=couple_profiles.id));
create policy profiles_own_insert on public.couple_profiles for insert to authenticated
 with check (id=(select auth.uid()));
create policy profiles_own_update on public.couple_profiles for update to authenticated
 using (id=(select auth.uid())) with check(id=(select auth.uid()));
create policy couples_read on public.couples for select to authenticated
 using (couple_private.is_member(id));
create policy members_read on public.couple_members for select to authenticated
 using (couple_private.is_member(couple_id));
create policy invitations_read on public.couple_invitations for select to authenticated
 using (couple_private.is_member(couple_id));
create policy rolls_read on public.couple_rolls for select to authenticated
 using (couple_private.is_member(couple_id));
create policy sessions_read on public.couple_sessions for select to authenticated
 using (couple_private.is_member(couple_id));
create policy personal_rolls_read on public.couple_personal_rolls for select to authenticated
 using (exists(select 1 from public.couple_sessions s
   where s.id=couple_personal_rolls.session_id and couple_private.is_member(s.couple_id)));
create policy challenges_read on public.couple_challenges for select to authenticated
 using (couple_private.is_member(couple_id));
create policy advent_read on public.couple_advent for select to authenticated
 using (couple_private.is_member(couple_id));
create policy intimacy_read on public.couple_intimacy for select to authenticated
 using (couple_private.is_member(couple_id));
create policy feedback_read on public.couple_feedback for select to authenticated
 using (couple_private.is_member(couple_id));
create policy events_read on public.couple_events for select to authenticated
 using (couple_private.is_member(couple_id));

-- Shared intimacy data written by either partner; deletion only by the author.
create policy intimacy_author_insert on public.couple_intimacy for insert to authenticated
 with check (author_id=(select auth.uid()) and couple_private.is_member(couple_id));
create policy intimacy_author_delete on public.couple_intimacy for delete to authenticated
 using (author_id=(select auth.uid()) and couple_private.is_member(couple_id));
create policy feedback_author_insert on public.couple_feedback for insert to authenticated
 with check (author_id=(select auth.uid()) and couple_private.is_member(couple_id)
 and exists(select 1 from public.couple_sessions s
  where s.id=session_id and s.couple_id=couple_feedback.couple_id and s.finished_at is not null));
create policy feedback_author_update on public.couple_feedback for update to authenticated
 using (author_id=(select auth.uid()) and couple_private.is_member(couple_id))
 with check (author_id=(select auth.uid()) and couple_private.is_member(couple_id));

-- Profiles are created *only from the signed-in user's profile or an explicitly
-- submitted first-sign-in name*, never from hardcoded 'Fred'/'Émilie'.
create or replace function public.save_my_profile(p_name text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 if char_length(trim(p_name)) not between 1 and 80 then
  raise exception 'Un nom de 1 à 80 caractères est requis'; end if;
 insert into public.couple_profiles(id,display_name) values(auth.uid(),trim(p_name))
 on conflict (id) do update set display_name=excluded.display_name;
end; $$;

create or replace function public.create_my_couple()
returns uuid language plpgsql security definer set search_path='' as $$
declare c uuid;
begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 if not exists(select 1 from public.couple_profiles where id=auth.uid()) then
  raise exception 'Choisissez un nom de profil'; end if;
 if exists(select 1 from public.couple_members where user_id=auth.uid()) then
  raise exception 'Vous êtes déjà dans un couple'; end if;
 insert into public.couples default values returning id into c;
 insert into public.couple_members(couple_id,user_id) values(c,auth.uid());
 return c;
end; $$;

-- Token generated by WebCrypto in the browser, only a SHA256 digest is stored.
create or replace function public.create_pair_invite(p_couple uuid,p_email text,p_token_hash text)
returns uuid language plpgsql security definer set search_path='' as $$
declare n integer; inv uuid;
begin
 if not couple_private.is_member(p_couple) then raise exception 'Accès refusé'; end if;
 select count(*) into n from public.couple_members where couple_id=p_couple;
 if n>=2 then raise exception 'Couple déjà complet'; end if;
 if trim(p_email) !~* '^[^ @]+@[^ @]+\.[^ @]+$' then raise exception 'Courriel invalide'; end if;
 if p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'Token invalide'; end if;
 if lower(trim(p_email))=(select lower(email) from auth.users where id=auth.uid()) then
  raise exception 'Invitez votre partenaire, pas votre propre compte'; end if;
 insert into public.couple_invitations(couple_id,invited_email,token_hash,created_by)
 values(p_couple,lower(trim(p_email)),p_token_hash,auth.uid()) returning id into inv;
 return inv;
end; $$;

create or replace function public.accept_pair_invite(p_token_hash text)
returns uuid language plpgsql security definer set search_path='' as $$
declare inv public.couple_invitations%rowtype; verified_email text; c uuid; n integer;
begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 select lower(email) into verified_email from auth.users
  where id=auth.uid() and email_confirmed_at is not null;
 if verified_email is null then raise exception 'Courriel de connexion non vérifié'; end if;
 select * into inv from public.couple_invitations
  where token_hash=p_token_hash and accepted_at is null and expires_at>now()
  for update;
 if not found or verified_email<>inv.invited_email then
  raise exception 'Invitation invalide ou destinée à un autre courriel'; end if;
 if exists(select 1 from public.couple_members where user_id=auth.uid()) then
  raise exception 'Vous appartenez déjà à un couple'; end if;
 if not exists(select 1 from public.couple_profiles where id=auth.uid()) then
  raise exception 'Choisissez d’abord votre nom de profil'; end if;
 c:=inv.couple_id;
 perform 1 from public.couples where id=c for update;
 select count(*) into n from public.couple_members where couple_id=c;
 if n<>1 then raise exception 'Invitation déjà utilisée ou couple complet'; end if;
 insert into public.couple_members(couple_id,user_id) values(c,auth.uid());
 update public.couple_invitations set accepted_at=now() where id=inv.id;
 insert into public.couple_events(couple_id,event_type,actor_id,title) values(c,'member',auth.uid(),'Partenaire connecté');
 return c;
end; $$;

-- A game roll is chosen on the server under a couple row lock. Client's
-- chosen animation/frame cannot alter the official result.
create or replace function public.roll_couple_once(p_couple uuid,p_kind text)
returns public.couple_rolls language plpgsql security definer set search_path='' as $$
declare v_key text; n integer; old public.couple_rolls%rowtype;
        local_now timestamp; d date; a integer;
begin
 if not couple_private.is_member(p_couple) then raise exception 'Accès refusé'; end if;
 if p_kind not in ('weekly','monthly_activity','monthly_host','monthly_restaurant') then
  raise exception 'Type de dé interdit'; end if;
 perform 1 from public.couples where id=p_couple for update;
 local_now := now() at time zone 'America/Toronto';
 d:=local_now::date;
 if p_kind='weekly' then
  v_key:=to_char((d-extract(isodow from d)::int+1)::date,'YYYY-MM-DD');
 else
  v_key:=to_char(d,'YYYY-MM');
 end if;
 select * into old from public.couple_rolls where couple_id=p_couple
  and kind=p_kind and key=v_key;
 if found then return old; end if;
 if p_kind='monthly_host' or p_kind='monthly_restaurant' then
  select face into a from public.couple_rolls where couple_id=p_couple
    and kind='monthly_activity' and key=v_key;
  if a is null then raise exception 'Brassez d’abord le D20 du mois'; end if;
  if p_kind='monthly_restaurant' and a not in (1,3,7,13,18) then
   raise exception 'Ce défi spécial ne concerne pas un restaurant'; end if;
  if p_kind='monthly_restaurant' and not exists(
    select 1 from public.couple_rolls where couple_id=p_couple and kind='monthly_host' and key=v_key)
  then raise exception 'Brassez d’abord pour déterminer qui invite'; end if;
 end if;
 if p_kind='weekly' then
  a:=floor(random()*100)::int;
  n:=case when a<50 then 1 when a<75 then 2 when a<87 then 3
   when a<95 then 4 when a<99 then 5 else 6 end;
 elsif p_kind='monthly_activity' then n:=floor(random()*20)::int+1;
 else n:=floor(random()*6)::int+1; end if;
 insert into public.couple_rolls(couple_id,kind,key,actor,face)
 values(p_couple,p_kind,v_key,auth.uid(),n) returning * into old;
 insert into public.couple_events(couple_id,event_type,actor_id,title)
 values(p_couple,'roll',auth.uid(),p_kind);
 return old;
end; $$;

create or replace function public.ensure_couple_session(p_couple uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare id_now uuid;
begin
 if not couple_private.is_member(p_couple) then raise exception 'Accès refusé'; end if;
 perform 1 from public.couples where id=p_couple for update;
 select id into id_now from public.couple_sessions where couple_id=p_couple
   and finished_at is null;
 if id_now is null then
  -- Never create more sessions in the current week than the weekly D6 allows.
  declare
   start_week date := ((now() at time zone 'America/Toronto')::date -
     (extract(isodow from (now() at time zone 'America/Toronto')::date)::int - 1));
   limit_week int;
   already int;
  begin
   select face into limit_week from public.couple_rolls
    where couple_id=p_couple and kind='weekly'
      and key=to_char(start_week,'YYYY-MM-DD');
   if limit_week is null then raise exception 'Brassez d’abord le dé de la semaine'; end if;
   select count(*) into already from public.couple_sessions
    where couple_id=p_couple and counted=true
      and (started_at at time zone 'America/Toronto')::date>=start_week;
   if already>=limit_week then raise exception 'Rituel de la semaine déjà complété'; end if;
  end;
  insert into public.couple_sessions(couple_id,opened_by)
   values(p_couple,auth.uid()) returning id into id_now;
  insert into public.couple_events(couple_id,event_type,actor_id,title)
   values(p_couple,'session',auth.uid(),'Soirée commencée');
 end if;
 return id_now;
end; $$;
create or replace function public.roll_my_evening_d6(p_session uuid)
returns public.couple_personal_rolls language plpgsql security definer set search_path='' as $$
declare s public.couple_sessions%rowtype; r public.couple_personal_rolls%rowtype;
begin
 select * into s from public.couple_sessions where id=p_session and finished_at is null;
 if not found or not couple_private.is_member(s.couple_id) then raise exception 'Soirée inaccessible'; end if;
 perform 1 from public.couple_sessions where id=p_session for update;
 select * into r from public.couple_personal_rolls where session_id=p_session and user_id=auth.uid();
 if found then return r; end if;
 insert into public.couple_personal_rolls(session_id,user_id,face)
 values(p_session,auth.uid(),floor(random()*6)::int+1) returning * into r;
 insert into public.couple_events(couple_id,event_type,actor_id,title)
 values(s.couple_id,'roll',auth.uid(),'D6 personnel');
 return r;
end; $$;

create or replace function public.draw_for_partner(p_session uuid,p_preference text,p_random boolean default false)
returns public.couple_challenges language plpgsql security definer set search_path='' as $$
declare s public.couple_sessions%rowtype; target uuid; v_cat text;
 candidates text[]:=array[]::text[]; weights int[]:=array[]::int[];
 total integer:=0; ticket integer; i integer; f integer; outrow public.couple_challenges%rowtype;
begin
 select * into s from public.couple_sessions where id=p_session and finished_at is null;
 if not found or not couple_private.is_member(s.couple_id) then raise exception 'Soirée inaccessible'; end if;
 if p_preference not in ('SENSUEL','COQUIN','SEXUEL') then raise exception 'Catégorie invalide'; end if;
 perform 1 from public.couple_sessions where id=p_session for update;
 select user_id into target from public.couple_members where couple_id=s.couple_id
  and user_id<>auth.uid();
 if target is null then raise exception 'Le partenaire doit accepter le match'; end if;
 if not exists(select 1 from public.couple_personal_rolls where session_id=p_session
   and user_id=auth.uid()) or not exists(select 1 from public.couple_personal_rolls
   where session_id=p_session and user_id=target) then
    raise exception 'Chaque partenaire doit d’abord brasser son D6'; end if;
 -- One pending proposal at a time. Lock on the session above serializes writers.
 if exists(select 1 from public.couple_challenges where session_id=p_session
   and recipient=target and status in ('proposed','accepted')) then
   raise exception 'Votre partenaire doit accepter, passer ou terminer son défi précédent';end if;
 -- Never create a challenge after the recipient completed their official D6 target.
 if (select count(*) from public.couple_challenges where session_id=p_session
      and recipient=target and status='completed') >=
    (select face from public.couple_personal_rolls
      where session_id=p_session and user_id=target) then
   raise exception 'Tous les défis de votre partenaire sont terminés';end if;
 for i in 1..3 loop
  v_cat:= (array['SENSUEL','COQUIN','SEXUEL'])[i];
  if (select count(*) from public.couple_challenges where session_id=p_session
      and recipient=target and category=v_cat)<20 then
   candidates:=array_append(candidates,v_cat);
   weights:=array_append(weights,case when p_random then
    (case when v_cat='SEXUEL' then 40 else 30 end)
    else (case when v_cat=p_preference then 70 else 15 end) end);
   total:=total+weights[array_length(weights,1)];
  end if;
 end loop;
 if total=0 then raise exception 'Plus de défis disponibles pour ce partenaire'; end if;
 ticket:=floor(random()*total)::int;
 for i in 1..array_length(candidates,1) loop
  if ticket<weights[i] then v_cat:=candidates[i];exit;end if;
  ticket:=ticket-weights[i];
 end loop;
 select face into f from generate_series(1,20) as face
  where not exists(select 1 from public.couple_challenges c where c.session_id=p_session
    and c.recipient=target and c.category=v_cat and c.face=face)
  order by random() limit 1;
 insert into public.couple_challenges(session_id,couple_id,offered_by,recipient,category,face)
 values(p_session,s.couple_id,auth.uid(),target,v_cat,f) returning * into outrow;
 insert into public.couple_events(couple_id,event_type,actor_id,title)
 values(s.couple_id,'challenge',auth.uid(),'Défi proposé');
 return outrow;
end; $$;
create or replace function public.answer_challenge(p_id uuid,p_status text)
returns void language plpgsql security definer set search_path='' as $$
declare c public.couple_challenges%rowtype;
begin
 if p_status not in ('accepted','passed','completed') then raise exception 'Statut invalide';end if;
 select * into c from public.couple_challenges where id=p_id for update;
 if not found or c.recipient<>auth.uid() then raise exception 'Seul le destinataire peut répondre';end if;
 if p_status='completed' and c.status<>'accepted' then raise exception 'Acceptez d’abord le défi';end if;
 if c.status not in ('proposed','accepted') then raise exception 'Défi déjà terminé';end if;
 update public.couple_challenges set status=p_status where id=p_id;
end; $$;
create or replace function public.finish_couple_session(p_session uuid,p_count boolean default true)
returns void language plpgsql security definer set search_path='' as $$
declare c uuid; member uuid; target int; done int;
begin
 select couple_id into c from public.couple_sessions
  where id=p_session and finished_at is null for update;
 if c is null or not couple_private.is_member(c) then
  raise exception 'Soirée inaccessible'; end if;
 if p_count then
  if (select count(*) from public.couple_members where couple_id=c)<>2 then
   raise exception 'Votre partenaire doit être connecté'; end if;
  for member in select user_id from public.couple_members where couple_id=c loop
   select face into target from public.couple_personal_rolls
    where session_id=p_session and user_id=member;
   if target is null then raise exception 'Les deux D6 sont nécessaires';end if;
   select count(*) into done from public.couple_challenges
    where session_id=p_session and recipient=member and status='completed';
   if done<target then raise exception 'Il reste des défis à terminer';end if;
  end loop;
 end if;
 update public.couple_sessions set finished_at=now(), counted=p_count where id=p_session;
 insert into public.couple_events(couple_id,event_type,actor_id,title)
 values(c,'session',auth.uid(),
   case when p_count then 'Soirée terminée et comptée' else 'Soirée arrêtée sans la compter' end);
end; $$;

create or replace function public.open_advent_day(p_couple uuid,p_day int)
returns public.couple_advent language plpgsql security definer set search_path='' as $$
declare d date; rowout public.couple_advent%rowtype; partner uuid;
begin
 if not couple_private.is_member(p_couple) then raise exception 'Accès refusé'; end if;
 d:=(now() at time zone 'America/Toronto')::date;
 if extract(month from d)::int<>12 or p_day<1 or p_day>25
   or p_day>extract(day from d)::int then
  raise exception 'Cette case est encore verrouillée'; end if;
 perform 1 from public.couples where id=p_couple for update;
 select * into rowout from public.couple_advent
  where couple_id=p_couple and year=extract(year from d)::int and day=p_day;
 if found then return rowout;end if;
 select user_id into partner from public.couple_members where couple_id=p_couple
  order by random() limit 1;
 insert into public.couple_advent(couple_id,year,day,opened_by,performed_by)
 values(p_couple,extract(year from d)::int,p_day,auth.uid(),partner)
 returning * into rowout;
 insert into public.couple_events(couple_id,event_type,actor_id,title)
 values(p_couple,'advent',auth.uid(),'Case de décembre');
 return rowout;
end; $$;

-- All RPCs are authenticated and check membership; no privileged direct write
-- privileges to game tables, invitations, or membership.
revoke all on all tables in schema public from anon;
revoke insert,update,delete on public.couples,public.couple_members,public.couple_invitations,
 public.couple_rolls,public.couple_sessions,public.couple_personal_rolls,
 public.couple_challenges,public.couple_advent,public.couple_events from authenticated;
grant select on public.couple_profiles,public.couples,public.couple_members,public.couple_invitations,
 public.couple_rolls,public.couple_sessions,public.couple_personal_rolls,
 public.couple_challenges,public.couple_advent,public.couple_intimacy,
 public.couple_feedback,public.couple_events to authenticated;
grant insert,delete on public.couple_intimacy to authenticated;
grant insert,update on public.couple_feedback to authenticated;
grant insert,update on public.couple_profiles to authenticated;

revoke execute on function public.save_my_profile(text),public.create_my_couple(),
 public.create_pair_invite(uuid,text,text),public.accept_pair_invite(text),
 public.roll_couple_once(uuid,text),public.ensure_couple_session(uuid),
 public.roll_my_evening_d6(uuid),public.draw_for_partner(uuid,text,boolean),
 public.answer_challenge(uuid,text),public.finish_couple_session(uuid,boolean),
 public.open_advent_day(uuid,int) from public,anon;
grant execute on function public.save_my_profile(text),public.create_my_couple(),
 public.create_pair_invite(uuid,text,text),public.accept_pair_invite(text),
 public.roll_couple_once(uuid,text),public.ensure_couple_session(uuid),
 public.roll_my_evening_d6(uuid),public.draw_for_partner(uuid,text,boolean),
 public.answer_challenge(uuid,text),public.finish_couple_session(uuid,boolean),
 public.open_advent_day(uuid,int) to authenticated;

-- Real-time can broadcast roll/session/feedback changes to signed-in members.
alter publication supabase_realtime add table public.couple_rolls;
alter publication supabase_realtime add table public.couple_personal_rolls;
alter publication supabase_realtime add table public.couple_challenges;
alter publication supabase_realtime add table public.couple_feedback;
alter publication supabase_realtime add table public.couple_intimacy;
alter publication supabase_realtime add table public.couple_advent;
alter publication supabase_realtime add table public.couple_members;

alter publication supabase_realtime add table public.couple_events;
