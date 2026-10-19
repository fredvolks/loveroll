-- Save the six original user-written event descriptions exactly as JSON.
create or replace function public.import_love_special_events(p_couple uuid,p_events jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare k text; e jsonb; d6 jsonb; n int;
begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 perform 1 from public.couples where id=p_couple for update;
 if not found or not couple_private.is_member(p_couple)
 or not exists(select 1 from public.couples c where c.id=p_couple
  and c.owner_user_id=auth.uid())
 then raise exception 'Seul le créateur du couple peut importer les événements';end if;
 if jsonb_typeof(p_events->'evenements_speciaux')<>'object'
 or (select count(*) from jsonb_object_keys(p_events->'evenements_speciaux'))<>6
 then raise exception 'Six événements spéciaux sont requis';end if;
 foreach k in array array['saint_valentin','anniversaire_de_couple',
 'fete_des_meres','fete_des_peres','mon_anniversaire',
 'anniversaire_de_mon_partenaire'] loop
  e:=p_events->'evenements_speciaux'->k;
  if e is null
   or length(btrim(coalesce(e->>'evenement',''))) not between 3 and 120
   or length(btrim(coalesce(e->>'date',''))) not between 4 and 50
  then raise exception 'Événement incorrect: %',k;end if;
  foreach d6 in array array[e->'D6_activite',e->'D6_modificateur'] loop
   if jsonb_typeof(d6)<>'array' or jsonb_array_length(d6)<>6
   then raise exception 'Six résultats sont requis pour chaque D6 de %',k;end if;
   for n in 1..6 loop
    if jsonb_typeof(d6->(n-1))<>'object'
      or (select count(*) from jsonb_object_keys(d6->(n-1)))<>1
      or length(btrim(coalesce(d6->(n-1)->>(n::text),''))) not between 5 and 1000
    then raise exception 'Option D6 % incorrecte pour %',n,k;end if;
   end loop;
  end loop;
 end loop;
 insert into public.love_special_event_catalogue(couple_id,events)
 values(p_couple,p_events)
 on conflict(couple_id) do update set events=excluded.events,updated_at=now();
end;$$;
create or replace function public.my_love_special_event_keys(p_couple uuid)
returns text[] language plpgsql security definer stable set search_path='' as $$
declare val jsonb;
begin
 if auth.uid() is null or not couple_private.is_member(p_couple)
 then raise exception 'Accès refusé';end if;
 select events->'evenements_speciaux' into val
 from public.love_special_event_catalogue where couple_id=p_couple;
 if val is null then return array[]::text[];end if;
 return array(select jsonb_object_keys(val));
end;$$;
revoke all on function public.my_love_special_event_keys(uuid) from public,anon;
grant execute on function public.my_love_special_event_keys(uuid) to authenticated;
revoke all on function public.import_love_special_events(uuid,jsonb) from public,anon;
grant execute on function public.import_love_special_events(uuid,jsonb) to authenticated;
