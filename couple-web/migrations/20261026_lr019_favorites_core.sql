-- LR-019: exactly five SHARED cards per couple across both partners/categories.
-- The member who last added a card is attributed; either member may remove it.
-- This does NOT yet alter D100 eligibility.
-- Apply only with the companion draw-engine/UX release and an approved migration plan.
BEGIN;

CREATE TABLE IF NOT EXISTS public.love_couple_favorites (
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('SENSUEL','SEXUEL')),
  card_id integer NOT NULL CHECK (card_id BETWEEN 1 AND 100),
  marked_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marked_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (couple_id,category,card_id)
);
-- Never silently collapse older per-member rows if an experimental
-- preproduction schema already exists. Keep every historical heart and stop
-- until an explicit, reviewed consolidation of duplicates is performed.
DO $schema$
DECLARE key_definition text;
BEGIN
 SELECT pg_get_constraintdef(c.oid) INTO key_definition
 FROM pg_constraint c WHERE c.conrelid='public.love_couple_favorites'::regclass
  AND c.contype='p';
 IF key_definition IS DISTINCT FROM 'PRIMARY KEY (couple_id, category, card_id)' THEN
  RAISE EXCEPTION 'Ancien schéma de coups de cœur : migration supervisée nécessaire';
 END IF;
END
$schema$;
CREATE INDEX IF NOT EXISTS love_couple_favorites_pair
 ON public.love_couple_favorites(couple_id,category,card_id);
ALTER TABLE public.love_couple_favorites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.love_couple_favorites FROM PUBLIC,anon,authenticated;

-- One heart per card for the couple; authenticated members may edit the common set.
CREATE OR REPLACE FUNCTION public.set_love_couple_favorite(
 p_couple uuid,p_category text,p_card_id integer,p_enabled boolean
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $favorite$
DECLARE v_actor uuid:=(SELECT auth.uid());
BEGIN
 PERFORM public.love_require_verified_identity();
 IF v_actor IS NULL OR p_couple IS NULL OR NOT couple_private.is_member(p_couple) THEN
  RAISE EXCEPTION 'Accès au duo refusé';
 END IF;
 IF p_category IS NULL OR p_category NOT IN ('SENSUEL','SEXUEL')
    OR p_card_id IS NULL OR p_card_id NOT BETWEEN 1 AND 100
    OR p_enabled IS NULL THEN
  RAISE EXCEPTION 'Paramètres du coup de cœur invalides';
 END IF;
 -- Same lock order as the official draw: couples first. Prevent races with reset.
 PERFORM 1 FROM public.couples c WHERE c.id=p_couple FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Duo introuvable'; END IF;
 IF p_enabled THEN
  -- Existing official/custom challenge OR a genuinely historical card.
  -- An archived custom card can be remembered without making it drawable.
  IF NOT EXISTS(SELECT 1 FROM public.love_base_challenges b
                WHERE b.category=p_category AND b.card_id=p_card_id)
     AND NOT EXISTS(SELECT 1 FROM public.love_custom_challenges c
                    WHERE c.couple_id=p_couple AND c.category=p_category
                      AND c.card_id=p_card_id)
     AND NOT EXISTS(SELECT 1 FROM public.couple_challenges h
                    WHERE h.couple_id=p_couple AND h.category=p_category
                      AND h.card_id=p_card_id) THEN
   RAISE EXCEPTION 'Ce défi ne figure pas dans la bibliothèque ou les archives du duo';
  END IF;
  -- Couple-first FOR UPDATE above serializes both partners' concurrent taps.
  -- The five-card allowance belongs to the WHOLE COUPLE, not each actor.
  -- A heart already in the common set stays idempotent.
  IF NOT EXISTS(
    SELECT 1 FROM public.love_couple_favorites f
    WHERE f.couple_id=p_couple AND f.category=p_category
      AND f.card_id=p_card_id
  ) AND (
    SELECT count(*) FROM public.love_couple_favorites f
    WHERE f.couple_id=p_couple
  )>=5 THEN
    RAISE EXCEPTION 'Maximum de 5 coups de cœur atteint. Retirez un favori pour en ajouter un nouveau.';
  END IF;
  INSERT INTO public.love_couple_favorites(couple_id,category,card_id,marked_by)
  VALUES(p_couple,p_category,p_card_id,v_actor)
  ON CONFLICT(couple_id,category,card_id) DO NOTHING;
 ELSE
  DELETE FROM public.love_couple_favorites f
   WHERE f.couple_id=p_couple AND f.category=p_category
    AND f.card_id=p_card_id;
 END IF;
 -- True if this card is in the couple's one shared list.
 RETURN EXISTS(SELECT 1 FROM public.love_couple_favorites f
  WHERE f.couple_id=p_couple AND f.category=p_category AND f.card_id=p_card_id);
END;
$favorite$;
REVOKE ALL ON FUNCTION public.set_love_couple_favorite(uuid,text,integer,boolean)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_love_couple_favorite(uuid,text,integer,boolean)
 TO authenticated;

-- One-click sixth-card replacement. A stale selection NEVER removes a
-- different favorite, and an invalid new card leaves the existing five intact.
-- Couple-first lock serializes both partners' simultaneous actions.
CREATE OR REPLACE FUNCTION public.replace_love_couple_favorite(
 p_couple uuid,p_old_category text,p_old_card_id integer,
 p_new_category text,p_new_card_id integer
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $replace$
DECLARE v_actor uuid:=(select auth.uid());
BEGIN
 PERFORM public.love_require_verified_identity();
 IF v_actor IS NULL OR p_couple IS NULL OR NOT couple_private.is_member(p_couple) THEN
  RAISE EXCEPTION 'Accès au duo refusé' USING errcode='42501';
 END IF;
 IF p_old_category IS NULL OR p_new_category IS NULL
  OR p_old_category NOT IN ('SENSUEL','SEXUEL')
  OR p_new_category NOT IN ('SENSUEL','SEXUEL')
  OR p_old_card_id IS NULL OR p_old_card_id NOT BETWEEN 1 AND 100
  OR p_new_card_id IS NULL OR p_new_card_id NOT BETWEEN 1 AND 100 THEN
  RAISE EXCEPTION 'Paramètres des favoris invalides';
 END IF;
 PERFORM 1 FROM public.couples WHERE id=p_couple FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Duo introuvable'; END IF;
 IF (SELECT count(*) FROM public.love_couple_favorites WHERE couple_id=p_couple)>5 THEN
  RAISE EXCEPTION 'Plus de 5 favoris historiques : retirez les excédents avant un remplacement';
 END IF;
 -- Lost RPC reply: replacement was already committed; don't remove again.
 IF EXISTS(SELECT 1 FROM public.love_couple_favorites
    WHERE couple_id=p_couple AND category=p_new_category AND card_id=p_new_card_id)
    AND NOT EXISTS(SELECT 1 FROM public.love_couple_favorites
    WHERE couple_id=p_couple AND category=p_old_category AND card_id=p_old_card_id)
 THEN RETURN true; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.love_couple_favorites
    WHERE couple_id=p_couple AND category=p_old_category AND card_id=p_old_card_id)
 THEN RAISE EXCEPTION 'Le favori choisi a changé; actualisez la liste'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.love_base_challenges
    WHERE category=p_new_category AND card_id=p_new_card_id)
  AND NOT EXISTS(SELECT 1 FROM public.love_custom_challenges
    WHERE couple_id=p_couple AND category=p_new_category AND card_id=p_new_card_id)
  AND NOT EXISTS(SELECT 1 FROM public.couple_challenges
    WHERE couple_id=p_couple AND category=p_new_category AND card_id=p_new_card_id)
 THEN RAISE EXCEPTION 'Nouveau défi indisponible dans votre bibliothèque et archives'; END IF;
 IF p_old_category=p_new_category AND p_old_card_id=p_new_card_id THEN RETURN true; END IF;
 -- If another member already starred this new card, it is already shared;
 -- never discard a different original favorite in this case.
 IF EXISTS(SELECT 1 FROM public.love_couple_favorites
    WHERE couple_id=p_couple AND category=p_new_category AND card_id=p_new_card_id)
 THEN RETURN true; END IF;
 DELETE FROM public.love_couple_favorites
 WHERE couple_id=p_couple AND category=p_old_category AND card_id=p_old_card_id;
 INSERT INTO public.love_couple_favorites(couple_id,category,card_id,marked_by)
 VALUES(p_couple,p_new_category,p_new_card_id,v_actor);
 RETURN true;
END;
$replace$;
REVOKE ALL ON FUNCTION public.replace_love_couple_favorite(uuid,text,integer,text,integer)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.replace_love_couple_favorite(uuid,text,integer,text,integer)
 TO authenticated;

CREATE OR REPLACE FUNCTION public.my_love_couple_favorites(p_couple uuid)
RETURNS TABLE(category text,card_id integer,marked_by uuid,marked_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $list$
BEGIN
 PERFORM public.love_require_verified_identity();
 IF (SELECT auth.uid()) IS NULL OR p_couple IS NULL
    OR NOT couple_private.is_member(p_couple) THEN
  RAISE EXCEPTION 'Accès au duo refusé';
 END IF;
 RETURN QUERY
 SELECT f.category,f.card_id,f.marked_by,f.marked_at
 FROM public.love_couple_favorites f
 WHERE f.couple_id=p_couple
 ORDER BY f.category,f.card_id,f.marked_at,f.marked_by;
END;
$list$;
REVOKE ALL ON FUNCTION public.my_love_couple_favorites(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.my_love_couple_favorites(uuid)
 TO authenticated;

-- Eligibility guard only: the D100 engine must still enforce role, exclusions,
-- category distribution, 200-card statistics and same-session uniqueness.
CREATE OR REPLACE FUNCTION public.love_favorite_from_prior_evening(
 p_couple uuid,p_session uuid,p_category text,p_card_id integer
) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $prior$
DECLARE v_started timestamptz;
BEGIN
 PERFORM public.love_require_verified_identity();
 IF (SELECT auth.uid()) IS NULL OR p_couple IS NULL
    OR NOT couple_private.is_member(p_couple) THEN
  RAISE EXCEPTION 'Accès au duo refusé';
 END IF;
 SELECT s.started_at INTO v_started FROM public.couple_sessions s
 WHERE s.id=p_session AND s.couple_id=p_couple AND s.finished_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Soirée active introuvable'; END IF;
 RETURN EXISTS (
  SELECT 1 FROM public.love_couple_favorites f
  WHERE f.couple_id=p_couple AND f.category=p_category AND f.card_id=p_card_id
    AND f.marked_at<v_started
 );
END;
$prior$;
REVOKE ALL ON FUNCTION public.love_favorite_from_prior_evening(uuid,uuid,text,integer)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.love_favorite_from_prior_evening(uuid,uuid,text,integer)
 TO authenticated;

COMMIT;
