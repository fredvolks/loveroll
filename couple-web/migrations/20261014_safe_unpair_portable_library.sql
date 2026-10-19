-- LoveRoll: dissociation sûre, bibliothèque personnelle conservée lors d'un nouveau match.
-- Aucune suppression de défis, d'historique commun ni d'utilisateurs.
create table if not exists public.love_user_library_backup (
 user_id uuid primary key references auth.users(id) on delete cascade,
 source_couple_id uuid not null references public.couples(id),
 custom_cards jsonb not null default '[]'::jsonb,
 monthly_activities jsonb not null default '[]'::jsonb,
 advent_config jsonb not null default '[]'::jsonb,
 advent_days jsonb not null default '[]'::jsonb,
 special_events jsonb not null default '[]'::jsonb,
 saved_at timestamptz not null default now()
);
alter table public.love_user_library_backup enable row level security;
drop policy if exists love_user_library_backup_owner on public.love_user_library_backup;
create policy love_user_library_backup_owner on public.love_user_library_backup
 for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.love_user_library_backup from public,anon,authenticated;
grant select on public.love_user_library_backup to authenticated;

-- Snapshot per-user: only the creator's edited cards/config are portable.
-- Couple history, mutual gifts and private journals are deliberately NOT copied.
create or replace function couple_private.snapshot_love_library(p_couple uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_owner uuid;
begin
 select owner_user_id into v_owner from public.couples where id=p_couple;
 if v_owner is null then return;end if;
 insert into public.love_user_library_backup(
  user_id,source_couple_id,custom_cards,monthly_activities,advent_config,advent_days,special_events,saved_at)
 values(
  v_owner,p_couple,
  coalesce((select jsonb_agg(to_jsonb(x)-'couple_id' order by x.category,x.card_id)
    from public.love_custom_challenges x where x.couple_id=p_couple),'[]'::jsonb),
  coalesce((select jsonb_agg(to_jsonb(x)-'couple_id' order by x.face)
    from public.love_monthly_activity_overrides x where x.couple_id=p_couple),'[]'::jsonb),
  coalesce((select jsonb_agg(to_jsonb(x)-'couple_id')
    from public.love_advent_2026_config x where x.couple_id=p_couple),'[]'::jsonb),
  coalesce((select jsonb_agg(to_jsonb(x)-'couple_id' order by x.day)
    from public.love_advent_2026_days x where x.couple_id=p_couple),'[]'::jsonb),
  coalesce((select jsonb_agg(to_jsonb(x)-'couple_id')
    from public.love_special_event_catalogue x where x.couple_id=p_couple),'[]'::jsonb),
  now())
 on conflict(user_id) do update set
  source_couple_id=excluded.source_couple_id,
  custom_cards=excluded.custom_cards,
  monthly_activities=excluded.monthly_activities,
  advent_config=excluded.advent_config,
  advent_days=excluded.advent_days,
  special_events=excluded.special_events,
  saved_at=excluded.saved_at;
end;$$;
revoke all on function couple_private.snapshot_love_library(uuid) from public,anon,authenticated;

-- Recover edited challenges even for a previously ended match.
do $$
declare old_couple record;
begin
 for old_couple in
  select distinct on (c.owner_user_id) c.id
  from public.couples c
  where c.owner_user_id is not null
  order by c.owner_user_id,
   (select count(*) from public.love_custom_challenges x where x.couple_id=c.id) desc,
   c.created_at desc
 loop
  perform couple_private.snapshot_love_library(old_couple.id);
 end loop;
end;$$;

-- Restore a PERSONAL copy into a newly created couple before inviting anyone.
-- This runs only for the first member and not for a later invited partner.
create or replace function couple_private.restore_love_library_for_new_owner()
returns trigger language plpgsql security definer set search_path='' as $$
declare saved public.love_user_library_backup%rowtype;
begin
 if not exists(select 1 from public.couples c
   where c.id=new.couple_id and c.owner_user_id=new.user_id)
   or (select count(*) from public.couple_members where couple_id=new.couple_id)<>1
 then return new;end if;
 select * into saved from public.love_user_library_backup
 where user_id=new.user_id;
 if not found then return new;end if;

 insert into public.love_custom_challenges(
  couple_id,category,card_id,title,description,timer_minutes,
  recipient_user_id,drawer_user_id,recipient_role,drawer_role)
 select new.couple_id,card.category,card.card_id,card.title,card.description,
  card.timer_minutes,null,null,coalesce(card.recipient_role,'both'),coalesce(card.drawer_role,'both')
 from jsonb_to_recordset(saved.custom_cards) as card(
  category text,card_id smallint,title text,description text,timer_minutes smallint,
  recipient_role text,drawer_role text)
 on conflict(couple_id,category,card_id) do nothing;

 insert into public.love_monthly_activity_overrides(
  couple_id,face,title,description,is_restaurant,timer_minutes)
 select new.couple_id,x.face,x.title,x.description,coalesce(x.is_restaurant,false),x.timer_minutes
 from jsonb_to_recordset(saved.monthly_activities) as x(
  face integer,title text,description text,is_restaurant boolean,timer_minutes smallint)
 on conflict(couple_id,face) do nothing;

 insert into public.love_advent_2026_config(
  couple_id,calendar_title,target_audience,note)
 select new.couple_id,x.calendar_title,coalesce(x.target_audience,'18+'),coalesce(x.note,'')
 from jsonb_to_recordset(saved.advent_config) as x(
  calendar_title text,target_audience text,note text)
 on conflict(couple_id) do nothing;

 insert into public.love_advent_2026_days(
  couple_id,day,type,title,description,timer_minutes)
 select new.couple_id,x.day,x.type,x.title,x.description,x.timer_minutes
 from jsonb_to_recordset(saved.advent_days) as x(
  day smallint,type text,title text,description text,timer_minutes smallint)
 on conflict(couple_id,day) do nothing;

 insert into public.love_special_event_catalogue(couple_id,events)
 select new.couple_id,x.events
 from jsonb_to_recordset(saved.special_events) as x(events jsonb)
 on conflict(couple_id) do nothing;
 return new;
end;$$;
revoke all on function couple_private.restore_love_library_for_new_owner()
 from public,anon,authenticated;
drop trigger if exists zz_restore_love_library_on_new_match on public.couple_members;
create trigger zz_restore_love_library_on_new_match
after insert on public.couple_members
for each row execute function couple_private.restore_love_library_for_new_owner();

-- Keep existing privacy protections and journal backfill, adding
-- personal library snapshot BEFORE membership removal.
create or replace function public.end_love_match(p_couple uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 perform 1 from public.couples where id=p_couple for update;
 if not found or not couple_private.is_member(p_couple)
 then raise exception 'Accès refusé';end if;
 insert into public.love_personal_intimacy
  (user_id,source_event_id,source_couple_id,happened_on,ciphertext,journal_salt,created_at)
 select i.author_id,i.id,i.couple_id,i.happened_on,i.ciphertext,c.journal_salt,i.created_at
 from public.couple_intimacy i
 join public.couples c on c.id=i.couple_id
 join public.couple_members m on m.couple_id=i.couple_id and m.user_id=i.author_id
 where i.couple_id=p_couple
 on conflict(user_id,source_event_id) do nothing;
 perform couple_private.snapshot_love_library(p_couple);
 update public.couple_invitations set expires_at=now()
 where couple_id=p_couple and accepted_at is null;
 delete from public.couple_members where couple_id=p_couple;
end;$$;
revoke all on function public.end_love_match(uuid) from public,anon;
grant execute on function public.end_love_match(uuid) to authenticated;
