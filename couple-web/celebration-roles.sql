-- LoveRoll : fixed giver and receiver for celebrations; shared anniversary.
alter table public.couple_occasion_settings add column if not exists celebrants jsonb
 not null default '{}'::jsonb;

create or replace function public.set_love_celebrant(
 p_couple uuid,p_kind text,p_user uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not couple_private.is_member(p_couple) or
   not exists(select 1 from public.couples c where c.id=p_couple and c.owner_user_id=auth.uid())
 then raise exception 'Réservé à l’administrateur du couple';end if;
 if p_kind not in ('mothers_day','fathers_day','womens_day','mens_day') or
   not exists(select 1 from public.couple_members m
    where m.couple_id=p_couple and m.user_id=p_user)
 then raise exception 'Personne célébrée invalide';end if;
 perform 1 from public.couples where id=p_couple for update;
 insert into public.couple_occasion_settings(couple_id)
 values(p_couple) on conflict(couple_id) do nothing;
 update public.couple_occasion_settings set
 celebrants=jsonb_set(coalesce(celebrants,'{}'::jsonb),array[p_kind],to_jsonb(p_user::text),true),
 updated_at=now()
 where couple_id=p_couple;
end;$$;
revoke all on function public.set_love_celebrant(uuid,text,uuid) from public,anon;
grant execute on function public.set_love_celebrant(uuid,text,uuid) to authenticated;

create or replace function couple_private.love_occasion_date(p_couple uuid,p_kind text,p_owner uuid,p_year int)
returns date language plpgsql stable security definer set search_path = '' as $$
declare md text; m int;d int;start_date date;
begin
 if p_kind='valentine' then return make_date(p_year,2,14);end if;
 if p_kind='womens_day' then return make_date(p_year,3,8);end if;
 if p_kind='mens_day' then return make_date(p_year,11,19);end if;
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

create or replace function public.roll_love_occasion_once(
 p_couple uuid,p_kind text,p_owner uuid default null,p_roll text default 'surprise')
returns public.couple_occasion_rolls language plpgsql security definer set search_path = '' as $$
declare localday date; yr int; candidate date; target date; eventyear int;
 eventkey text; first_roll public.couple_occasion_rolls%rowtype;
 rowout public.couple_occasion_rolls%rowtype;n int;
begin
 if auth.uid() is null or not couple_private.is_member(p_couple) then
  raise exception 'Accès refusé';end if;
 if p_kind not in ('valentine','anniversary','mothers_day','fathers_day','womens_day','mens_day','birthday') then
  raise exception 'Occasion invalide';end if;
 if p_roll not in ('surprise','host') then raise exception 'Type de dé invalide';end if;
 if p_roll='host' and p_kind in ('mothers_day','fathers_day','womens_day','mens_day','birthday','anniversary','valentine')
 then raise exception 'Pour cette fête, la personne qui offre est déjà déterminée';end if;
 if p_kind='birthday' and (p_owner is null or not exists(
   select 1 from public.couple_members where couple_id=p_couple and user_id=p_owner
 )) then raise exception 'L’anniversaire doit appartenir à un membre du couple';end if;
 perform 1 from public.couples where id=p_couple for update;
 if p_kind in ('mothers_day','fathers_day','womens_day','mens_day') and
  not exists(select 1 from public.couple_occasion_settings o,
   public.couple_members m where o.couple_id=p_couple and m.couple_id=p_couple
   and m.user_id=(o.celebrants->>p_kind)::uuid)
 then raise exception 'L’administrateur doit désigner la personne célébrée';end if;
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

revoke execute on function public.roll_love_occasion_once(uuid,text,uuid,text) from public,anon;
grant execute on function public.roll_love_occasion_once(uuid,text,uuid,text) to authenticated;
