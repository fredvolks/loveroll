-- LoveRoll: seasonal celebrations and personal anniversaries.
-- Runs ONLY on project ejsrqfpkgwraorrznjpm (separate from Mon Wallet).
create table public.couple_occasion_settings(
 couple_id uuid primary key references public.couples(id) on delete cascade,
 anniversary_md text check (anniversary_md is null or anniversary_md ~ '^[0-9]{2}-[0-9]{2}$'),
 birthday_by_user jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
create table public.couple_occasion_rolls(
 couple_id uuid not null references public.couples(id) on delete cascade,
 event_year integer not null check(event_year between 2020 and 2150),
 occasion_key text not null check(char_length(occasion_key) between 3 and 80),
 roll_type text not null check(roll_type in ('surprise','host')),
 face smallint not null check(face between 1 and 20),
 actor uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 primary key(couple_id,event_year,occasion_key,roll_type),
 check(roll_type<>'host' or face<=6)
);
create index on public.couple_occasion_rolls(couple_id,created_at desc);
alter table public.couple_occasion_settings enable row level security;
alter table public.couple_occasion_rolls enable row level security;
create policy occasion_settings_read on public.couple_occasion_settings for select to authenticated
 using(couple_private.is_member(couple_id));
create policy occasion_rolls_read on public.couple_occasion_rolls for select to authenticated
 using(couple_private.is_member(couple_id));
revoke all on public.couple_occasion_settings,public.couple_occasion_rolls from anon;
revoke insert,update,delete on public.couple_occasion_settings,public.couple_occasion_rolls from authenticated;
grant select on public.couple_occasion_settings,public.couple_occasion_rolls to authenticated;

create or replace function public.set_love_occasion_date(p_couple uuid,p_kind text,p_month_day text)
returns void language plpgsql security definer set search_path = '' as $$
declare m int;d int;future date;current jsonb;
begin
 if auth.uid() is null or not couple_private.is_member(p_couple) then
  raise exception 'Accès refusé';end if;
 if p_kind not in ('anniversary','birthday') then raise exception 'Type de date invalide';end if;
 if p_month_day is not null then
  if p_month_day !~ '^[0-9]{2}-[0-9]{2}$' then raise exception 'Utilisez MM-JJ'; end if;
  m:=split_part(p_month_day,'-',1)::int;d:=split_part(p_month_day,'-',2)::int;
  if m not between 1 and 12 or d not between 1 and 31 then raise exception 'Date invalide';end if;
  future:=make_date(2000,m,d); -- Leap-year validation includes Feb 29.
 end if;
 perform 1 from public.couples where id=p_couple for update;
 insert into public.couple_occasion_settings(couple_id) values(p_couple)
 on conflict(couple_id) do nothing;
 if p_kind='anniversary' then
  update public.couple_occasion_settings
   set anniversary_md=p_month_day,updated_at=now() where couple_id=p_couple;
 else
  select birthday_by_user into current from public.couple_occasion_settings where couple_id=p_couple for update;
  current:=coalesce(current,'{}'::jsonb);
  if p_month_day is null then current:=current - auth.uid()::text;
  else current:=jsonb_set(current,array[auth.uid()::text],to_jsonb(p_month_day),true);end if;
  update public.couple_occasion_settings
   set birthday_by_user=current,updated_at=now() where couple_id=p_couple;
 end if;
end; $$;
create or replace function couple_private.love_occasion_date(p_couple uuid,p_kind text,p_owner uuid,p_year int)
returns date language plpgsql stable security definer set search_path = '' as $$
declare md text; m int;d int;start_date date;
begin
 if p_kind='valentine' then return make_date(p_year,2,14);end if;
 if p_kind='mothers_day' then
  start_date:=make_date(p_year,5,1);
  return start_date + ((7-extract(dow from start_date)::int)%7) + 7;
 end if;
 if p_kind='fathers_day' then
  start_date:=make_date(p_year,6,1);
  return start_date + ((7-extract(dow from start_date)::int)%7) + 14;
 end if;
 if p_kind='anniversary' then
  select anniversary_md into md from public.couple_occasion_settings
  where couple_id=p_couple;
 elsif p_kind='birthday' then
  if p_owner is null or not exists(select 1 from public.couple_members
    where couple_id=p_couple and user_id=p_owner) then return null;end if;
  select birthday_by_user->>p_owner::text into md from public.couple_occasion_settings
  where couple_id=p_couple;
 else return null;end if;
 if md is null then return null;end if;
 m:=split_part(md,'-',1)::int;d:=split_part(md,'-',2)::int;
 if m=2 and d=29 and not(
   p_year%4=0 and (p_year%100<>0 or p_year%400=0)
 ) then d:=28;end if;
 return make_date(p_year,m,d);
end; $$;
revoke all on function couple_private.love_occasion_date(uuid,text,uuid,int) from public,anon,authenticated;
-- This helper remains private; only the SECURITY DEFINER roll RPC may call it.

create or replace function public.roll_love_occasion_once(
 p_couple uuid,p_kind text,p_owner uuid default null,p_roll text default 'surprise')
returns public.couple_occasion_rolls language plpgsql security definer set search_path = '' as $$
declare localday date; yr int; candidate date; target date; eventyear int;
 eventkey text; first_roll public.couple_occasion_rolls%rowtype;
 rowout public.couple_occasion_rolls%rowtype;n int;
begin
 if auth.uid() is null or not couple_private.is_member(p_couple) then
  raise exception 'Accès refusé';end if;
 if p_kind not in ('valentine','anniversary','mothers_day','fathers_day','birthday') then
  raise exception 'Occasion invalide';end if;
 if p_roll not in ('surprise','host') then raise exception 'Type de dé invalide';end if;
 if p_kind='birthday' and (p_owner is null or not exists(
   select 1 from public.couple_members where couple_id=p_couple and user_id=p_owner
 )) then raise exception 'L’anniversaire doit appartenir à un membre du couple';end if;
 perform 1 from public.couples where id=p_couple for update;
 localday:=(now() at time zone 'America/Toronto')::date;
 -- Allow planning 14 days ahead for babysitting and 7 days after the event.
 for yr in extract(year from localday)::int-1..extract(year from localday)::int+1 loop
  candidate:=couple_private.love_occasion_date(p_couple,p_kind,p_owner,yr);
  if candidate between localday-7 and localday+14 then
   target:=candidate;eventyear:=yr;exit;
  end if;
 end loop;
 if target is null then raise exception 'Cette occasion n’est pas encore ouverte (14 jours avant, 7 jours après)';end if;
 eventkey:=p_kind||case when p_kind='birthday' then ':'||p_owner::text else '' end;
 select * into rowout from public.couple_occasion_rolls where couple_id=p_couple
  and event_year=eventyear and occasion_key=eventkey and roll_type=p_roll;
 if found then return rowout;end if;
 if p_roll='host' then
  select * into first_roll from public.couple_occasion_rolls
   where couple_id=p_couple and event_year=eventyear and occasion_key=eventkey
   and roll_type='surprise';
  if not found then raise exception 'Brassez le D20 de la surprise avant le D6';end if;
  n:=floor(random()*6)::int+1;
 else n:=floor(random()*20)::int+1;end if;
 insert into public.couple_occasion_rolls(couple_id,event_year,occasion_key,roll_type,face,actor)
 values(p_couple,eventyear,eventkey,p_roll,n) returning * into rowout;
 insert into public.couple_events(couple_id,event_type,actor_id,title)
 values(p_couple,'roll',auth.uid(),'LoveRoll · '||eventkey||' · '||p_roll);
 return rowout;
end; $$;
revoke all on function public.set_love_occasion_date(uuid,text,text),
 public.roll_love_occasion_once(uuid,text,uuid,text) from public,anon;
grant execute on function public.set_love_occasion_date(uuid,text,text),
 public.roll_love_occasion_once(uuid,text,uuid,text) to authenticated;
alter publication supabase_realtime add table public.couple_occasion_rolls;
