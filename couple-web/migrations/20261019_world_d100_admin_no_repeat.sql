-- Follow platform owner setting for annual D100 no-repeat, default enabled.
create or replace function public.roll_couple_once(p_couple uuid, p_kind text)
 returns public.couple_rolls
 language plpgsql security definer set search_path = ''
as $$
declare
 v_key text; n integer; old public.couple_rolls%rowtype;
 local_now timestamp; d date; a integer; is_restaurant boolean;
 v_weekly_weights integer[]; v_weekly_enabled boolean;
 selected public.love_monthly_activity_defaults%rowtype;
 edited public.love_monthly_activity_overrides%rowtype;
 world_entry public.love_world_experiences%rowtype;
 world_on boolean := false;
begin
 perform public.love_require_verified_identity();
 if not couple_private.is_member(p_couple) then raise exception 'Accès refusé';end if;
 if p_kind not in ('weekly','monthly_activity','monthly_host','monthly_restaurant') then
  raise exception 'Type de dé interdit';end if;
 perform 1 from public.couples where id=p_couple for update;
 local_now:=now() at time zone 'America/Toronto';
 d:=local_now::date;
 if p_kind='weekly' then
  v_key:=to_char((d-extract(isodow from d)::int+1)::date,'YYYY-MM-DD');
 else v_key:=to_char(d,'YYYY-MM');
 end if;
 select * into old from public.couple_rolls where couple_id=p_couple and kind=p_kind and key=v_key;
 if found then return old;end if;
 if p_kind='monthly_host' or p_kind='monthly_restaurant' then
  select face,coalesce(activity_is_restaurant,face in (1,3,7,13,18))
  into a,is_restaurant from public.couple_rolls where couple_id=p_couple and kind='monthly_activity' and key=v_key;
  if a is null then raise exception 'Brassez d’abord le D100 du mois';end if;
  if p_kind='monthly_restaurant' and not coalesce(is_restaurant,false) then
   raise exception 'Ce défi spécial ne concerne pas un restaurant';end if;
  if p_kind='monthly_restaurant' and not exists(
   select 1 from public.couple_rolls where couple_id=p_couple and kind='monthly_host' and key=v_key
  ) then raise exception 'Brassez d’abord pour déterminer qui invite';end if;
 end if;
 if p_kind='weekly' then
  select weekly_face_weights,weekly_weights_enabled
  into v_weekly_weights,v_weekly_enabled from public.couples where id=p_couple;
  n:=couple_private.roll_love_weighted_d6(v_weekly_weights,v_weekly_enabled);
 elsif p_kind='monthly_activity' then
  select face into n from public.love_world_experiences e
  where (select annual_no_repeat from public.love_platform_settings where id=1)=false
   or not exists(select 1 from public.love_monthly_face_years y
    where y.couple_id=p_couple and y.year=extract(year from d)::int and y.face=e.face)
  order by random() limit 1;
  if n is null then raise exception 'Les 100 expériences de cette année ont été utilisées';end if;
 else n:=floor(random()*6)::int+1;end if;
 if p_kind='monthly_activity' then
  select * into selected from public.love_monthly_activity_defaults where face=n;
  if selected.face is null then raise exception 'Activité du mois manquante';end if;
  select * into edited from public.love_monthly_activity_overrides
  where couple_id=p_couple and face=n and catalogue_version=2;
  select coalesce(activity_localization_enabled,false) into world_on
  from public.couples where id=p_couple;
  if world_on then select * into world_entry from public.love_world_experiences where face=n;end if;
  insert into public.couple_rolls(
   couple_id,kind,key,actor,face,activity_title,activity_description,activity_is_restaurant,activity_timer_minutes,
   activity_region,activity_location,activity_budget,activity_hiver,activity_ete,
   activity_distance_km_est,activity_prix_hiver_min,activity_prix_hiver_max,
   activity_prix_ete_min,activity_prix_ete_max,activity_hotel_inclus,activity_budget_note)
  values(p_couple,p_kind,v_key,auth.uid(),n,
   coalesce(edited.title,world_entry.title,selected.title),
   coalesce(edited.description,world_entry.description,selected.description),
   case when world_on then world_entry.theme='restaurant' else coalesce(edited.is_restaurant,selected.is_restaurant) end,
   edited.timer_minutes,
   case when world_on then null else selected.region end,
   case when world_on then null else selected.location end,
   case when world_on then null else selected.budget end,
   case when world_on then null else selected.hiver end,
   case when world_on then null else selected.ete end,
   case when world_on then null else selected.distance_km_est end,
   case when world_on then null else selected.prix_hiver_min end,
   case when world_on then null else selected.prix_hiver_max end,
   case when world_on then null else selected.prix_ete_min end,
   case when world_on then null else selected.prix_ete_max end,
   case when world_on then false else selected.hotel_inclus end,
   case when world_on then null else selected.budget_note end)
   returning * into old;
  insert into public.love_monthly_face_years(couple_id,year,face,roll_id)
   values(p_couple,extract(year from d)::int,n,old.id)
   on conflict(couple_id,year,face) do nothing;
 else
  insert into public.couple_rolls(couple_id,kind,key,actor,face)
   values(p_couple,p_kind,v_key,auth.uid(),n) returning * into old;
 end if;
 insert into public.couple_events(couple_id,event_type,actor_id,title)
  values(p_couple,'roll',auth.uid(),p_kind);
 return old;
end;
$$;
