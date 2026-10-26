-- LR-015 phase 2: private, couple-specific exclusions for the CURRENT 200-card cycle.
-- Does not change draws yet; the future refuse-and-redraw RPC will insert rows.
-- Do not enable a Refuser button before its atomic server operation is complete.
BEGIN;

CREATE TABLE IF NOT EXISTS public.love_cycle_excluded_cards (
 couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
 cycle_number integer NOT NULL CHECK(cycle_number>=1),
 category text NOT NULL CHECK(category IN ('SENSUEL','SEXUEL')),
 card_id integer NOT NULL CHECK(card_id BETWEEN 1 AND 100),
 excluded_by uuid NOT NULL REFERENCES auth.users(id),
 excluded_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(couple_id,cycle_number,category,card_id)
);
ALTER TABLE public.love_cycle_excluded_cards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.love_cycle_excluded_cards FROM PUBLIC,anon,authenticated;

-- Visibility is limited to verified participants, scoped to the active cycle.
-- An old cycle is retained as history but NEVER filters the newly-reset cycle.
CREATE OR REPLACE FUNCTION public.my_love_cycle_exclusions(p_couple uuid)
RETURNS TABLE(category text,card_id integer,excluded_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $read$
BEGIN
 PERFORM public.love_require_verified_identity();
 IF (select auth.uid()) IS NULL OR p_couple IS NULL
    OR NOT couple_private.is_member(p_couple) THEN
  RAISE EXCEPTION 'Accès au duo refusé';
 END IF;
 RETURN QUERY
 SELECT e.category,e.card_id,e.excluded_at
 FROM public.love_cycle_excluded_cards e
 JOIN public.couples c ON c.id=e.couple_id
 WHERE e.couple_id=p_couple AND e.cycle_number=c.challenge_cycle_number
 ORDER BY e.excluded_at,e.category,e.card_id;
END;
$read$;
REVOKE ALL ON FUNCTION public.my_love_cycle_exclusions(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.my_love_cycle_exclusions(uuid)
 TO authenticated;

-- Both partners may restore a previously excluded challenge.
-- This function cannot exclude new cards or tamper with previous cycles.
CREATE OR REPLACE FUNCTION public.restore_love_cycle_exclusion(
 p_couple uuid,p_category text,p_card_id integer
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $restore$
DECLARE v_cycle integer; v_deleted integer;
BEGIN
 PERFORM public.love_require_verified_identity();
 IF (select auth.uid()) IS NULL OR p_couple IS NULL
    OR NOT couple_private.is_member(p_couple) THEN
  RAISE EXCEPTION 'Accès au duo refusé';
 END IF;
 IF p_category IS NULL OR p_category NOT IN ('SENSUEL','SEXUEL')
    OR p_card_id IS NULL OR p_card_id NOT BETWEEN 1 AND 100 THEN
  RAISE EXCEPTION 'Carte invalide';
 END IF;
 -- Serialize with draws/refusals/reset; never restore a stale cycle.
 SELECT c.challenge_cycle_number INTO v_cycle
 FROM public.couples c WHERE c.id=p_couple FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Duo introuvable'; END IF;
 DELETE FROM public.love_cycle_excluded_cards e
 WHERE e.couple_id=p_couple AND e.cycle_number=v_cycle
   AND e.category=p_category AND e.card_id=p_card_id;
 GET DIAGNOSTICS v_deleted=ROW_COUNT;
 RETURN v_deleted>0;
END;
$restore$;
REVOKE ALL ON FUNCTION public.restore_love_cycle_exclusion(uuid,text,integer)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.restore_love_cycle_exclusion(uuid,text,integer)
 TO authenticated;

COMMIT;
