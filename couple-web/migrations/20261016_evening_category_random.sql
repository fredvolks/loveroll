-- LoveRoll Soirée: unbiased 50/50 choice of preferred category,
-- delegated to the existing secure draw function.
-- Since the normal function selects the preferred category with 88% and
-- the other with 12%, averaging either preference with equal probability
-- makes the final category distribution 50/50 when both categories are eligible.
-- Gifted draws preserve their original 100% chosen category rule;
-- random mode selects that eligible category fairly first.
-- Do NOT replace draw_for_partner: it owns locking, quotas, card uniqueness,
-- recipient permissions and all authoritative result storage.
BEGIN;
CREATE OR REPLACE FUNCTION public.draw_for_partner_random(p_session uuid)
RETURNS public.couple_challenges
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=''
AS $fn$
BEGIN
  RETURN public.draw_for_partner(
    p_session,
    CASE WHEN random() < 0.5 THEN 'SENSUEL'::text ELSE 'SEXUEL'::text END,
    false
  );
END;
$fn$;
REVOKE ALL ON FUNCTION public.draw_for_partner_random(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.draw_for_partner_random(uuid) TO authenticated;
COMMIT;
