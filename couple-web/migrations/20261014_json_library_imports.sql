-- LoveRoll JSON library imports: all-or-nothing transaction, owner only.
-- No historical draws are edited. JSON never includes credentials, IDs or journal entries.
alter table public.love_monthly_activity_overrides
 add column if not exists timer_minutes smallint check(timer_minutes between 1 and 60);
alter table public.couple_rolls
 add column if not exists activity_timer_minutes smallint check(activity_timer_minutes between 1 and 60);
alter table public.love_advent_2026_days
 add column if not exists timer_minutes smallint check(timer_minutes between 1 and 60);
alter table public.couple_advent
 add column if not exists advent_timer_minutes smallint check(advent_timer_minutes between 1 and 60);
alter table public.couple_occasion_rolls
 add column if not exists timer_minutes smallint check(timer_minutes between 1 and 60);
alter table public.love_special_modifier_snapshots
 add column if not exists modifier_timers jsonb;

create or replace function public.import_love_evening_library(p_couple uuid,p_library jsonb)
returns void language plpgsql security definer set search_path to ''
as $function$
declare category text; card jsonb; n int; dur int; roles text[]; seen int[];
begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 perform 1 from public.couples where id=p_couple and owner_user_id=auth.uid() for update;
 if not found then raise exception 'Administrateur uniquement';end if;
 category:=p_library->>'category';
 if p_library->>'format'<>'loveroll-evening' or p_library->>'version'<>'1'
 or category not in ('SENSUEL','SEXUEL')
 or jsonb_typeof(p_library->'cards')<>'array' or jsonb_array_length(p_library->'cards')<>35
 then raise exception 'Liste invalide : 35 cartes Sensuel ou Sexuel requises';end if;
 seen:=array[]::int[];
 for card in select value from jsonb_array_elements(p_library->'cards') loop
  if jsonb_typeof(card)<>'object' or coalesce(card->>'card_id','') !~ '^[0-9]{1,2}$'
  then raise exception 'Numéro de carte invalide';end if;
  n:=(card->>'card_id')::int;
  if n not between 1 and 35 or n=any(seen) then raise exception 'Carte répétée ou hors plage : %',n;end if;
  seen:=array_append(seen,n);
  if n<=25 or coalesce(card->>'title','')<>'' or coalesce(card->>'description','')<>'' then
   if length(btrim(coalesce(card->>'title',''))) not between 3 and 120
     or length(btrim(coalesce(card->>'description',''))) not between 10 and 900
   then raise exception 'Titre ou consigne invalide carte %',n;end if;
  else
   if (card->>'timer_minutes') is not null or card->>'drawer_role'<>'both'
    or card->>'recipient_role'<>'both'
   then raise exception 'Un emplacement vide doit être sans minuteur et avec droits neutres';end if;
  end if;
  roles:=array[card->>'drawer_role',card->>'recipient_role'];
  if roles[1] not in ('both','owner','partner') or roles[2] not in ('both','owner','partner')
   or (roles[1]=roles[2] and roles[1]<>'both')
   then raise exception 'Restrictions invalides carte %',n;end if;
  if (card->>'timer_minutes') is not null then
   if (card->>'timer_minutes') !~ '^[0-9]{1,2}$' then raise exception 'Minuteur invalide carte %',n;end if;
   dur:=(card->>'timer_minutes')::int;
   if dur not between 1 and 60 then raise exception 'Durée invalide carte %',n;end if;
  end if;
 end loop;
 delete from public.love_custom_challenges where couple_id=p_couple and category=category;
 insert into public.love_custom_challenges(couple_id,category,card_id,title,description,
  timer_minutes,drawer_role,recipient_role,drawer_user_id,recipient_user_id)
 select p_couple,category,(x.value->>'card_id')::int,x.value->>'title',x.value->>'description',
  nullif(x.value->>'timer_minutes','')::int,x.value->>'drawer_role',x.value->>'recipient_role',null,null
 from jsonb_array_elements(p_library->'cards') as x(value)
 where coalesce(x.value->>'title','')<>'' and coalesce(x.value->>'description','')<>'';
end;$function$;

create or replace function public.import_love_monthly_library(p_couple uuid,p_library jsonb)
returns void language plpgsql security definer set search_path to ''
as $function$
declare item jsonb; n integer; dur integer; seen int[];
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 perform 1 from public.couples where id=p_couple and owner_user_id=auth.uid() for update;
 if not found then raise exception 'Administrateur uniquement';end if;
 if p_library->>'format'<>'loveroll-monthly' or p_library->>'version'<>'1'
  or jsonb_typeof(p_library->'activities')<>'array'
  or jsonb_array_length(p_library->'activities')<>20
 then raise exception 'Fichier du mois invalide : les 20 faces sont obligatoires';end if;
 seen:=array[]::int[];
 for item in select value from jsonb_array_elements(p_library->'activities') loop
  if jsonb_typeof(item)<>'object' or coalesce(item->>'face','') !~ '^[0-9]{1,2}$'
   then raise exception 'Face du D20 invalide';end if;
  n:=(item->>'face')::int;
  if n not between 1 and 20 or n=any(seen) then raise exception 'Face répétée ou invalide';end if;
  seen:=array_append(seen,n);
  if length(btrim(coalesce(item->>'title',''))) not between 3 and 120 or
    length(btrim(coalesce(item->>'description',''))) not between 10 and 900 or
    jsonb_typeof(item->'is_restaurant')<>'boolean'
  then raise exception 'Sortie invalide face %',n;end if;
  if (item->>'timer_minutes') is not null then
   if (item->>'timer_minutes') !~ '^[0-9]{1,2}$' then raise exception 'Minuteur invalide face %',n;end if;
   dur:=(item->>'timer_minutes')::int;
   if dur not between 1 and 60 then raise exception 'Durée invalide face %',n;end if;
  end if;
 end loop;
 delete from public.love_monthly_activity_overrides where couple_id=p_couple;
 insert into public.love_monthly_activity_overrides(couple_id,face,title,description,is_restaurant,timer_minutes)
 select p_couple,(x.value->>'face')::int,x.value->>'title',x.value->>'description',
  (x.value->>'is_restaurant')::boolean,(x.value->>'timer_minutes')::int
 from jsonb_array_elements(p_library->'activities') as x(value);
end;$function$;
revoke all on function public.import_love_evening_library(uuid,jsonb) from public,anon;
revoke all on function public.import_love_monthly_library(uuid,jsonb) from public,anon;
grant execute on function public.import_love_evening_library(uuid,jsonb) to authenticated;
grant execute on function public.import_love_monthly_library(uuid,jsonb) to authenticated;

create or replace function public.save_love_monthly_activity_with_timer(
 p_couple uuid,p_face integer,p_title text,p_description text,p_is_restaurant boolean,p_timer_minutes integer)
returns void language plpgsql security definer set search_path to ''
as $function$
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 perform 1 from public.couples where id=p_couple and owner_user_id=auth.uid() for update;
 if not found then raise exception 'Administrateur uniquement';end if;
 if p_face not between 1 and 20 or length(btrim(p_title)) not between 3 and 120 or
 length(btrim(p_description)) not between 10 and 900 or p_is_restaurant is null or
 (p_timer_minutes is not null and p_timer_minutes not between 1 and 60)
 then raise exception 'Activité ou durée invalide';end if;
 insert into public.love_monthly_activity_overrides(couple_id,face,title,description,is_restaurant,timer_minutes)
 values(p_couple,p_face,btrim(p_title),btrim(p_description),p_is_restaurant,p_timer_minutes)
 on conflict(couple_id,face) do update set
 title=excluded.title,description=excluded.description,is_restaurant=excluded.is_restaurant,
 timer_minutes=excluded.timer_minutes,updated_at=now();
end;$function$;
revoke all on function public.save_love_monthly_activity_with_timer(uuid,integer,text,text,boolean,integer) from public,anon;
grant execute on function public.save_love_monthly_activity_with_timer(uuid,integer,text,text,boolean,integer) to authenticated;
