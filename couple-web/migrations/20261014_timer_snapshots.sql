CREATE OR REPLACE FUNCTION public.import_love_advent_2026(p_couple uuid, p_calendar jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  if (item->>'timer_minutes') is not null and
     ((item->>'timer_minutes') !~ '^[0-9]{1,2}$' or (item->>'timer_minutes')::int not between 1 and 60)
   then raise exception 'Minuteur invalide au jour %',d;end if;
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
 insert into public.love_advent_2026_days(couple_id,day,type,title,description,timer_minutes)
 select p_couple,(j.value->>'day')::integer,j.value->>'type',
  j.value->>'title',j.value->>'description',(j.value->>'timer_minutes')::int
 from jsonb_array_elements(p_calendar->'days') as j(value);
 -- No changes to the current year's previously opened couple_advent rows.
end;$function$
;

CREATE OR REPLACE FUNCTION public.open_advent_day(p_couple uuid, p_day integer)
 RETURNS couple_advent
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  advent_type,advent_title,advent_description,advent_timer_minutes)
 values(p_couple,extract(year from d)::int,p_day,auth.uid(),partner,
  custom.type,custom.title,custom.description,custom.timer_minutes)
 returning * into rowout;
 insert into public.couple_events(couple_id,event_type,actor_id,title)
 values(p_couple,'advent',auth.uid(),'Case de décembre');
 return rowout;
end;$function$
;

CREATE OR REPLACE FUNCTION public.roll_couple_once(p_couple uuid, p_kind text)
 RETURNS couple_rolls
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_key text; n integer; old public.couple_rolls%rowtype;
        local_now timestamp; d date; a integer; is_restaurant boolean;
 selected public.love_monthly_activity_defaults%rowtype;
 edited public.love_monthly_activity_overrides%rowtype;
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
  select face,coalesce(activity_is_restaurant,face in (1,3,7,13,18))
  into a,is_restaurant from public.couple_rolls where couple_id=p_couple
    and kind='monthly_activity' and key=v_key;
  if a is null then raise exception 'Brassez d’abord le D20 du mois'; end if;
  if p_kind='monthly_restaurant' and not coalesce(is_restaurant,false) then
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
 if p_kind='monthly_activity' then
  select * into edited from public.love_monthly_activity_overrides
   where couple_id=p_couple and face=n;
  if edited.face is null then
   select * into selected from public.love_monthly_activity_defaults where face=n;
   if selected.face is null then raise exception 'Activité du mois manquante';end if;
  end if;
  insert into public.couple_rolls(
   couple_id,kind,key,actor,face,activity_title,activity_description,activity_is_restaurant,activity_timer_minutes)
  values(p_couple,p_kind,v_key,auth.uid(),n,
   coalesce(edited.title,selected.title),
   coalesce(edited.description,selected.description),
   coalesce(edited.is_restaurant,selected.is_restaurant),edited.timer_minutes) returning * into old;
 else
  insert into public.couple_rolls(couple_id,kind,key,actor,face)
  values(p_couple,p_kind,v_key,auth.uid(),n) returning * into old;
 end if;
 insert into public.couple_events(couple_id,event_type,actor_id,title)
 values(p_couple,'roll',auth.uid(),p_kind);
 return old;
end; $function$
;

CREATE OR REPLACE FUNCTION public.roll_love_occasion_once(p_couple uuid, p_kind text, p_owner uuid DEFAULT NULL::uuid, p_roll text DEFAULT 'surprise'::text)
 RETURNS couple_occasion_rolls
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare localday date; yr int; candidate date; target date; eventyear int;
 eventkey text; first_roll public.couple_occasion_rolls%rowtype;
 rowout public.couple_occasion_rolls%rowtype;n int;
 owner_id uuid; data jsonb; event_code text; act jsonb; mod jsonb; mod_timers jsonb; prior public.couple_occasion_rolls%rowtype;
begin
 if auth.uid() is null or not couple_private.is_member(p_couple) then
  raise exception 'Accès refusé';end if;
 if p_kind not in ('valentine','anniversary','mothers_day','fathers_day','womens_day','mens_day','birthday') then
  raise exception 'Occasion invalide';end if;
 if p_roll not in ('surprise','host','activity','modifier') then raise exception 'Type de dé invalide';end if;
 if p_roll='host' and p_kind in ('mothers_day','fathers_day','womens_day','mens_day','birthday','anniversary','valentine')
 then raise exception 'Pour cette fête, la personne qui offre est déjà déterminée';end if;
 if p_kind='birthday' and (p_owner is null or not exists(
   select 1 from public.couple_members where couple_id=p_couple and user_id=p_owner
 )) then raise exception 'L’anniversaire doit appartenir à un membre du couple';end if;
 select owner_user_id into owner_id from public.couples where id=p_couple for update;
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
 event_code:=case p_kind
  when 'valentine' then 'saint_valentin'
  when 'anniversary' then 'anniversaire_de_couple'
  when 'mothers_day' then 'fete_des_meres'
  when 'fathers_day' then 'fete_des_peres'
  when 'birthday' then case when p_owner=owner_id
   then 'mon_anniversaire' else 'anniversaire_de_mon_partenaire' end
  else null end;
 if eventyear>=2027 and event_code is not null then
  select events->'evenements_speciaux'->event_code into data
   from public.love_special_event_catalogue where couple_id=p_couple;
 end if;
 if p_roll='activity' then
  if data is null then raise exception 'Aucune activité D6 configurée pour cette fête';end if;
  act:=data->'D6_activite'; mod:=data->'D6_modificateur';
  n:=floor(random()*6)::int+1;
  insert into public.couple_occasion_rolls(
   couple_id,event_year,occasion_key,roll_type,face,actor,special_title,special_description,timer_minutes)
  values(p_couple,eventyear,eventkey,'activity',n,auth.uid(),
   'Activité spéciale',act->(n-1)->>(n::text),
   nullif(data->'minuteurs'->'D6_activite'->>(n-1),'')::int)
  returning * into rowout;
  insert into public.love_special_modifier_snapshots(
   couple_id,event_year,occasion_key,modifier_title,modifier_options,activity_options,modifier_timers)
  values(p_couple,eventyear,eventkey,'Règle supplémentaire',mod,act,
   data->'minuteurs'->'D6_modificateur')
  on conflict(couple_id,event_year,occasion_key) do nothing;
 elsif p_roll='modifier' then
  select * into prior from public.couple_occasion_rolls
   where couple_id=p_couple and event_year=eventyear and occasion_key=eventkey
    and roll_type='activity';
  if prior.couple_id is null then raise exception 'Brassez d’abord le D6 de l’activité';end if;
  select modifier_options,modifier_timers into mod,mod_timers from public.love_special_modifier_snapshots
   where couple_id=p_couple and event_year=eventyear and occasion_key=eventkey;
  if mod is null then raise exception 'Règles D6 indisponibles';end if;
  n:=floor(random()*6)::int+1;
  insert into public.couple_occasion_rolls(
   couple_id,event_year,occasion_key,roll_type,face,actor,modifier_title,modifier_text,timer_minutes)
  values(p_couple,eventyear,eventkey,'modifier',n,auth.uid(),
    'Règle supplémentaire',mod->(n-1)->>(n::text),
    nullif(mod_timers->>(n-1),'')::int)
  returning * into rowout;
 elsif p_roll='host' then
  select * into first_roll from public.couple_occasion_rolls
   where couple_id=p_couple and event_year=eventyear and occasion_key=eventkey
   and roll_type='surprise';
  if not found then raise exception 'Brassez le D20 de la surprise avant le D6';end if;
  n:=floor(random()*6)::int+1;
  insert into public.couple_occasion_rolls(couple_id,event_year,occasion_key,roll_type,face,actor)
  values(p_couple,eventyear,eventkey,p_roll,n) returning * into rowout;
 else
  if data is not null then raise exception 'Pour cette fête, utilisez les deux D6';end if;
  n:=floor(random()*20)::int+1;
  insert into public.couple_occasion_rolls(couple_id,event_year,occasion_key,roll_type,face,actor)
  values(p_couple,eventyear,eventkey,p_roll,n) returning * into rowout;
 end if;
 insert into public.couple_events(couple_id,event_type,actor_id,title)
 values(p_couple,'roll',auth.uid(),'LoveRoll · '||eventkey||' · '||p_roll);
 return rowout;
end; $function$
;