-- LoveRoll: independent admin-configured D6 distributions, without altering saved results.
-- Weekly defaults unchanged (50/25/12/8/4/1); evening defaults to uniform D6.
CREATE OR REPLACE FUNCTION couple_private.valid_love_d6_weights(p_weights integer[])
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $valid$
 SELECT coalesce(
   array_ndims(p_weights)=1 AND array_lower(p_weights,1)=1
   AND array_length(p_weights,1)=6 AND
   (SELECT count(weight)=6 AND sum(weight)=100
           AND coalesce(bool_and(weight BETWEEN 0 AND 100),false)
    FROM unnest(p_weights) AS entries(weight)),
   false
 );
$valid$;

ALTER TABLE public.couples
 ADD COLUMN IF NOT EXISTS weekly_weights_enabled boolean NOT NULL DEFAULT true,
 ADD COLUMN IF NOT EXISTS weekly_face_weights integer[] NOT NULL DEFAULT ARRAY[50,25,12,8,4,1]::integer[],
 ADD COLUMN IF NOT EXISTS evening_weights_enabled boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS evening_face_weights integer[] NOT NULL DEFAULT ARRAY[30,25,20,12,8,5]::integer[];

ALTER TABLE public.couples
 ADD CONSTRAINT love_weekly_weights_valid
 CHECK (couple_private.valid_love_d6_weights(weekly_face_weights)),
 ADD CONSTRAINT love_evening_weights_valid
 CHECK (couple_private.valid_love_d6_weights(evening_face_weights));

CREATE OR REPLACE FUNCTION couple_private.roll_love_weighted_d6(
 p_weights integer[],p_enabled boolean
) RETURNS integer LANGUAGE plpgsql VOLATILE SET search_path='' AS $weighted$
DECLARE v_ticket integer;v_total integer:=0;v_face integer;
BEGIN
 IF NOT coalesce(p_enabled,false) THEN
  RETURN floor(random()*6)::integer+1;
 END IF;
 IF NOT couple_private.valid_love_d6_weights(p_weights) THEN
  RAISE EXCEPTION 'Les pourcentages des six faces doivent totaliser 100';
 END IF;
 v_ticket:=floor(random()*100)::integer;
 FOR v_face IN 1..6 LOOP
  v_total:=v_total+p_weights[v_face];
  IF v_ticket<v_total THEN RETURN v_face; END IF;
 END LOOP;
 RAISE EXCEPTION 'Configuration du dé invalide';
END;
$weighted$;

CREATE OR REPLACE FUNCTION public.save_love_dice_weights(
 p_couple uuid,p_kind text,p_enabled boolean,p_weights integer[]
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $save$
DECLARE v_owner uuid;v_updated public.couples%rowtype;
BEGIN
 PERFORM public.love_require_verified_identity();
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
 IF p_kind NOT IN ('weekly','evening') OR p_kind IS NULL THEN
  RAISE EXCEPTION 'Type de pondération inconnu';
 END IF;
 IF p_enabled IS NULL OR NOT couple_private.valid_love_d6_weights(p_weights) THEN
  RAISE EXCEPTION 'Saisissez six pourcentages entiers de 0 à 100, total 100 pour cent';
 END IF;
 SELECT owner_user_id INTO v_owner FROM public.couples
 WHERE id=p_couple FOR UPDATE;
 IF NOT FOUND OR v_owner IS DISTINCT FROM auth.uid()
   OR NOT couple_private.is_member(p_couple) THEN
  RAISE EXCEPTION 'Seul l’administrateur peut changer les pondérations';
 END IF;
 IF p_kind='weekly' THEN
  UPDATE public.couples
  SET weekly_weights_enabled=p_enabled,weekly_face_weights=p_weights
  WHERE id=p_couple RETURNING * INTO v_updated;
 ELSE
  UPDATE public.couples
  SET evening_weights_enabled=p_enabled,evening_face_weights=p_weights
  WHERE id=p_couple RETURNING * INTO v_updated;
 END IF;
 RETURN jsonb_build_object('kind',p_kind,'enabled',p_enabled,'weights',p_weights);
END;
$save$;
REVOKE ALL ON FUNCTION public.save_love_dice_weights(uuid,text,boolean,integer[])
 FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_love_dice_weights(uuid,text,boolean,integer[])
 TO authenticated;

-- Preserve both original official RPCs except for their D6 face generation.
CREATE OR REPLACE FUNCTION public.roll_couple_once(p_couple uuid, p_kind text)
 RETURNS couple_rolls
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_key text; n integer; old public.couple_rolls%rowtype;
        local_now timestamp; d date; a integer; is_restaurant boolean;
        v_weekly_weights integer[]; v_weekly_enabled boolean;
 selected public.love_monthly_activity_defaults%rowtype;
 edited public.love_monthly_activity_overrides%rowtype;
BEGIN
 PERFORM public.love_require_verified_identity();
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
  select weekly_face_weights,weekly_weights_enabled
  into v_weekly_weights,v_weekly_enabled
  from public.couples where id=p_couple;
  n:=couple_private.roll_love_weighted_d6(v_weekly_weights,v_weekly_enabled);
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
end; $function$;

CREATE OR REPLACE FUNCTION public.roll_my_evening_d6(p_session uuid)
 RETURNS couple_personal_rolls
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE s public.couple_sessions%rowtype;
        r public.couple_personal_rolls%rowtype;
        v_evening_weights integer[];
        v_evening_enabled boolean;
BEGIN
 PERFORM public.love_require_verified_identity();
 SELECT * INTO s FROM public.couple_sessions
 WHERE id=p_session AND finished_at IS NULL;
 IF NOT FOUND OR NOT couple_private.is_member(s.couple_id) THEN
   RAISE EXCEPTION 'Soirée inaccessible';
 END IF;
 PERFORM 1 FROM public.couple_sessions WHERE id=p_session FOR UPDATE;
 SELECT * INTO r FROM public.couple_personal_rolls
  WHERE session_id=p_session AND user_id=auth.uid();
 IF NOT FOUND THEN
  SELECT evening_face_weights,evening_weights_enabled
  INTO v_evening_weights,v_evening_enabled
  FROM public.couples WHERE id=s.couple_id;
  INSERT INTO public.couple_personal_rolls(session_id,user_id,face)
   VALUES(p_session,auth.uid(),
    couple_private.roll_love_weighted_d6(v_evening_weights,v_evening_enabled))
   RETURNING * INTO r;
  INSERT INTO public.couple_events(couple_id,event_type,actor_id,title)
   VALUES(s.couple_id,'roll',auth.uid(),'D6 personnel lancé');
 END IF;
 -- IMPORTANT: return the real saved face immediately, never NULL or a fake 1.
 -- A second invocation returns the same record and DOES NOT reroll.
 RETURN r;
END;
$function$;
