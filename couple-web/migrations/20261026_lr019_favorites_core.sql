-- LR-019: private, per-member hearts. This does NOT yet alter D100 eligibility.
-- Apply only with the companion draw-engine/UX release and an approved migration plan.
BEGIN;

CREATE TABLE IF NOT EXISTS public.love_couple_favorites (
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('SENSUEL','SEXUEL')),
  card_id integer NOT NULL CHECK (card_id BETWEEN 1 AND 100),
  marked_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marked_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (couple_id,category,card_id,marked_by)
);
CREATE INDEX IF NOT EXISTS love_couple_favorites_pair
 ON public.love_couple_favorites(couple_id,category,card_id);
ALTER TABLE public.love_couple_favorites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.love_couple_favorites FROM PUBLIC,anon,authenticated;

-- Each member owns their heart. Both members can see the collective set.
-- Another member's heart is never removed by unmarking one's own.
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
  INSERT INTO public.love_couple_favorites(couple_id,category,card_id,marked_by)
  VALUES(p_couple,p_category,p_card_id,v_actor)
  ON CONFLICT(couple_id,category,card_id,marked_by) DO NOTHING;
 ELSE
  DELETE FROM public.love_couple_favorites f
   WHERE f.couple_id=p_couple AND f.category=p_category
    AND f.card_id=p_card_id AND f.marked_by=v_actor;
 END IF;
 -- True if anyone in the couple still marks the card as a favorite.
 RETURN EXISTS(SELECT 1 FROM public.love_couple_favorites f
  WHERE f.couple_id=p_couple AND f.category=p_category AND f.card_id=p_card_id);
END;
$favorite$;
REVOKE ALL ON FUNCTION public.set_love_couple_favorite(uuid,text,integer,boolean)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_love_couple_favorite(uuid,text,integer,boolean)
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
