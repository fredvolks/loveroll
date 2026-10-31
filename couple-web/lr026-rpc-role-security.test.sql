-- Role-level integration checks, disposable PostgreSQL 17 only.
-- The synthetic SECURITY DEFINER RPCs can use private helpers, while neither
-- the anonymous nor signed-in browser role can execute a helper directly.
-- This is NOT a substitute for two authenticated real Supabase accounts/RLS.
BEGIN;
SET LOCAL ROLE anon;
DO $lr026_anon$
DECLARE denied boolean;
BEGIN
  denied := false;
  BEGIN
    PERFORM public.draw_for_partner(
      '11111111-1111-4111-8111-111111111111'::uuid,'SENSUEL',false);
  EXCEPTION WHEN insufficient_privilege THEN
    denied := true;
  END;
  IF NOT denied THEN
    RAISE EXCEPTION 'LR-026: anon bypassed normal D100 RPC EXECUTE grant';
  END IF;

  denied := false;
  BEGIN
    PERFORM public.love_respond_and_redraw(
      '33333333-3333-4333-8333-333333333333'::uuid,'pass',false);
  EXCEPTION WHEN insufficient_privilege THEN
    denied := true;
  END;
  IF NOT denied THEN
    RAISE EXCEPTION 'LR-026: anon bypassed Passer/Refuser RPC EXECUTE grant';
  END IF;

  denied := false;
  BEGIN
    PERFORM couple_private.love_variety_rank(
      '11111111-1111-4111-8111-111111111111'::uuid,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,'SENSUEL',1);
  EXCEPTION WHEN insufficient_privilege THEN
    denied := true;
  END;
  IF NOT denied THEN
    RAISE EXCEPTION 'LR-026: anon directly executed a private helper';
  END IF;
END; $lr026_anon$;
ROLLBACK;

BEGIN;
SET LOCAL ROLE authenticated;
DO $lr026_authenticated$
DECLARE
  drawn public.couple_challenges;
  redrawn jsonb;
  denied boolean;
BEGIN
  -- Private helper is reachable inside the existing SECURITY DEFINER
  -- RPC while still being inaccessible to the signed-in browser role.
  SELECT * INTO drawn
  FROM public.draw_for_partner(
    '11111111-1111-4111-8111-111111111111'::uuid,'SENSUEL',false);
  IF drawn.card_id IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'LR-026: authenticated normal RPC selected card %',
      drawn.card_id;
  END IF;

  SELECT public.love_respond_and_redraw(
    '33333333-3333-4333-8333-333333333333'::uuid,'pass',false)
  INTO redrawn;
  IF (redrawn->>'card_id')::integer IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'LR-026: authenticated replacement RPC selected %',
      redrawn;
  END IF;

  denied := false;
  BEGIN
    PERFORM couple_private.love_variety_rank(
      '11111111-1111-4111-8111-111111111111'::uuid,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,'SENSUEL',1);
  EXCEPTION WHEN insufficient_privilege THEN
    denied := true;
  END;
  IF NOT denied THEN
    RAISE EXCEPTION 'LR-026: authenticated directly executed a private helper';
  END IF;
END; $lr026_authenticated$;
ROLLBACK;
