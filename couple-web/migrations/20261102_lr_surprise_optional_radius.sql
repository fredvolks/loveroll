-- LR-SURPRISE-001: "Toutes les distances" is an explicit NULL preference.
-- This does not authorize unlimited Geoapify usage. The Edge Function retains a
-- separate, finite technical radius and a bounded number of provider requests.
-- Additive migration. Apply only after review, before deploying the new UI/Edge.

ALTER TABLE public.couples
  ALTER COLUMN travel_radius_km DROP NOT NULL,
  ALTER COLUMN travel_radius_km DROP DEFAULT;

-- Existing CHECK constraint intentionally permits NULL; selected caps remain 10..500.
-- Preserve this RPC signature so installed clients and existing GRANTs continue working.
CREATE OR REPLACE FUNCTION public.save_love_travel_preferences(
  p_couple uuid, p_label text, p_lat numeric, p_lon numeric,
  p_radius integer, p_enabled boolean
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
 IF auth.uid() IS NULL OR NOT public.love_verified_identity() THEN
  RAISE EXCEPTION 'Compte connecté et courriel vérifié requis.' USING errcode='42501';
 END IF;
 IF p_couple IS NULL OR NOT EXISTS(
  SELECT 1 FROM public.couple_members m
  WHERE m.couple_id=p_couple AND m.user_id=auth.uid()
 ) THEN
  RAISE EXCEPTION 'Seuls les membres du duo peuvent modifier la région.' USING errcode='42501';
 END IF;
 IF char_length(coalesce(p_label,''))>120 OR
    (p_radius IS NOT NULL AND (p_radius<10 OR p_radius>500)) OR
    (p_lat IS NULL) <> (p_lon IS NULL) OR
    (p_lat IS NOT NULL AND
      (p_lat NOT BETWEEN -90 AND 90 OR p_lon NOT BETWEEN -180 AND 180)) THEN
  RAISE EXCEPTION 'Paramètres de région invalides.' USING errcode='22023';
 END IF;
 UPDATE public.couples SET
  travel_origin_label=coalesce(trim(p_label),''),
  travel_origin_lat=CASE WHEN p_lat IS NULL THEN NULL ELSE round(p_lat,2) END,
  travel_origin_lon=CASE WHEN p_lon IS NULL THEN NULL ELSE round(p_lon,2) END,
  travel_radius_km=p_radius,
  activity_localization_enabled=coalesce(p_enabled,false)
 WHERE id=p_couple;
 IF NOT FOUND THEN RAISE EXCEPTION 'Duo introuvable.'; END IF;
END;
$function$;

-- Do not alter auth, RLS, memberships, rolls or reservations.
