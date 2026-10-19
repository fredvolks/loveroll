create or replace function public.roll_love_occasion_once(
 p_couple uuid,p_kind text,p_owner uuid default null,p_roll text default 'surprise')
returns public.couple_occasion_rolls language plpgsql security definer set search_path = '' as $$
declare localday date; yr int; candidate date; target date; eventyear int;
 eventkey text; first_roll public.couple_occasion_rolls%rowtype;
 rowout public.couple_occasion_rolls%rowtype;n int;
 owner_id uuid; data jsonb; event_code text; act jsonb; mod jsonb; prior public.couple_occasion_rolls%rowtype;
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
   couple_id,event_year,occasion_key,roll_type,face,actor,special_title,special_description)
  values(p_couple,eventyear,eventkey,'activity',n,auth.uid(),
   'Activité spéciale',act->(n-1)->>(n::text))
  returning * into rowout;
  insert into public.love_special_modifier_snapshots(
   couple_id,event_year,occasion_key,modifier_title,modifier_options,activity_options)
  values(p_couple,eventyear,eventkey,'Règle supplémentaire',mod,act)
  on conflict(couple_id,event_year,occasion_key) do nothing;
 elsif p_roll='modifier' then
  select * into prior from public.couple_occasion_rolls
   where couple_id=p_couple and event_year=eventyear and occasion_key=eventkey
    and roll_type='activity';
  if prior.couple_id is null then raise exception 'Brassez d’abord le D6 de l’activité';end if;
  select modifier_options into mod from public.love_special_modifier_snapshots
   where couple_id=p_couple and event_year=eventyear and occasion_key=eventkey;
  if mod is null then raise exception 'Règles D6 indisponibles';end if;
  n:=floor(random()*6)::int+1;
  insert into public.couple_occasion_rolls(
   couple_id,event_year,occasion_key,roll_type,face,actor,modifier_title,modifier_text)
  values(p_couple,eventyear,eventkey,'modifier',n,auth.uid(),
    'Règle supplémentaire',mod->(n-1)->>(n::text))
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
end; $$;


revoke all on function public.roll_love_occasion_once(uuid,text,uuid,text) from public,anon;
grant execute on function public.roll_love_occasion_once(uuid,text,uuid,text) to authenticated;
notify pgrst,'reload schema';
