-- LoveRoll — private Advent 2026 JSON import, exact user-written contents.
-- Administrative import is separate from public game data until a case is unlocked.
-- This migration never deletes journals, challenge libraries or opened calendar cases.

create table if not exists public.love_advent_2026_config (
 couple_id uuid primary key references public.couples(id) on delete cascade,
 calendar_title text not null check(length(calendar_title) between 3 and 160),
 target_audience text not null default '18+' check(target_audience='18+'),
 note text not null default '' check(length(note)<=1200),
 updated_at timestamptz not null default now()
);
create table if not exists public.love_advent_2026_days (
 couple_id uuid not null references public.couples(id) on delete cascade,
 day smallint not null check(day between 1 and 25),
 type text not null check(length(type) between 2 and 90),
 title text not null check(length(title) between 3 and 200),
 description text not null check(length(description) between 10 and 1500),
 primary key(couple_id,day)
);
alter table public.love_advent_2026_config enable row level security;
alter table public.love_advent_2026_days enable row level security;
revoke all on public.love_advent_2026_config,public.love_advent_2026_days from public,anon;
grant select on public.love_advent_2026_config,public.love_advent_2026_days to authenticated;
drop policy if exists love_advent_config_owner_read on public.love_advent_2026_config;
create policy love_advent_config_owner_read on public.love_advent_2026_config
 for select to authenticated using (
 couple_private.is_member(couple_id) and exists(
 select 1 from public.couples c where c.id=couple_id
 and c.owner_user_id=(select auth.uid())));
drop policy if exists love_advent_days_owner_read on public.love_advent_2026_days;
create policy love_advent_days_owner_read on public.love_advent_2026_days
 for select to authenticated using (
 couple_private.is_member(couple_id) and exists(
 select 1 from public.couples c where c.id=couple_id
 and c.owner_user_id=(select auth.uid())));

alter table public.couple_advent add column if not exists advent_type text,
 add column if not exists advent_title text,
 add column if not exists advent_description text;

create or replace function public.import_love_advent_2026(
 p_couple uuid,p_calendar jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare
 item jsonb; d integer;
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 perform 1 from public.couples where id=p_couple for update;
 if not found or not couple_private.is_member(p_couple) or
  not exists(select 1 from public.couples c where c.id=p_couple and c.owner_user_id=auth.uid())
 then raise exception 'Seul le créateur du couple peut importer le calendrier';end if;
 if p_calendar is null or jsonb_typeof(p_calendar)<>'object' or
  p_calendar->>'year'<>'2026' or p_calendar->>'target_audience'<>'18+' or
  length(btrim(coalesce(p_calendar->>'calendar_title',''))) not between 3 and 160 or
  length(coalesce(p_calendar->>'note',''))>1200 or
  jsonb_typeof(p_calendar->'days')<>'array' or
  jsonb_array_length(p_calendar->'days')<>25
 then raise exception 'Le calendrier doit contenir un titre, l’année 2026 et 25 cases 18+';end if;
 for item in select value from jsonb_array_elements(p_calendar->'days')
 loop
  if jsonb_typeof(item)<>'object' or
   coalesce(item->>'day','') !~ '^[0-9]{1,2}$'
  then raise exception 'Numéro de jour invalide';end if;
  d:=(item->>'day')::integer;
  if d not between 1 and 25 or
   length(btrim(coalesce(item->>'type',''))) not between 2 and 90 or
   length(btrim(coalesce(item->>'title',''))) not between 3 and 200 or
   length(btrim(coalesce(item->>'description',''))) not between 10 and 1500
  then raise exception 'Contenu invalide au jour %',d;end if;
 end loop;
 if (select count(distinct (value->>'day')::integer)
     from jsonb_array_elements(p_calendar->'days'))<>25
 then raise exception 'Les 25 jours doivent être uniques';end if;
 insert into public.love_advent_2026_config(couple_id,calendar_title,target_audience,note)
 values(p_couple,p_calendar->>'calendar_title','18+',coalesce(p_calendar->>'note',''))
 on conflict(couple_id) do update set
  calendar_title=excluded.calendar_title,target_audience=excluded.target_audience,
  note=excluded.note,updated_at=now();
 delete from public.love_advent_2026_days where couple_id=p_couple;
 insert into public.love_advent_2026_days(couple_id,day,type,title,description)
 select p_couple,(j.value->>'day')::integer,j.value->>'type',
  j.value->>'title',j.value->>'description'
 from jsonb_array_elements(p_calendar->'days') as j(value);
 -- No changes to the current year's previously opened couple_advent rows.
end;$$;
revoke all on function public.import_love_advent_2026(uuid,jsonb) from public,anon;
grant execute on function public.import_love_advent_2026(uuid,jsonb) to authenticated;

-- The original date lock remains server enforced, with a single shared snapshot.
create or replace function public.open_advent_day(p_couple uuid,p_day int)
returns public.couple_advent language plpgsql security definer set search_path='' as $$
declare d date; rowout public.couple_advent%rowtype; partner uuid;
 custom public.love_advent_2026_days%rowtype;
begin
 if not couple_private.is_member(p_couple) then raise exception 'Accès refusé';end if;
 d:=(now() at time zone 'America/Toronto')::date;
 if extract(month from d)::int<>12 or p_day<1 or p_day>25
   or p_day>extract(day from d)::int
 then raise exception 'Cette case est encore verrouillée';end if;
 perform 1 from public.couples where id=p_couple for update;
 select * into rowout from public.couple_advent
  where couple_id=p_couple and year=extract(year from d)::int and day=p_day;
 if found then return rowout;end if;
 select user_id into partner from public.couple_members where couple_id=p_couple
  order by random() limit 1;
 if extract(year from d)::int=2026 then
  select * into custom from public.love_advent_2026_days
   where couple_id=p_couple and day=p_day;
 end if;
 insert into public.couple_advent(
  couple_id,year,day,opened_by,performed_by,
  advent_type,advent_title,advent_description)
 values(p_couple,extract(year from d)::int,p_day,auth.uid(),partner,
  custom.type,custom.title,custom.description)
 returning * into rowout;
 insert into public.couple_events(couple_id,event_type,actor_id,title)
 values(p_couple,'advent',auth.uid(),'Case de décembre');
 return rowout;
end;$$;
revoke all on function public.open_advent_day(uuid,int) from public,anon;
grant execute on function public.open_advent_day(uuid,int) to authenticated;
notify pgrst,'reload schema';
