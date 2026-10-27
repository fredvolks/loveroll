-- LR-015 permission checks with actual PostgreSQL authenticated/anon roles.
-- Uses fixture-only accounts and the same ephemeral PostgreSQL job as contract tests.
\set ON_ERROR_STOP on
GRANT USAGE ON SCHEMA public,auth,couple_private TO authenticated,anon;

SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
SET ROLE authenticated;
DO $test$
DECLARE denied boolean:=false; granted boolean:=false;
BEGIN
 -- The narrow authenticated RPC exposes only current-cycle IDs.
 SELECT public.love_redraw_capabilities('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') INTO granted;
 IF granted IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'Couple member cannot use validated redraw capabilities';
 END IF;
 PERFORM 1 FROM public.my_love_cycle_exclusions('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') LIMIT 1;
 BEGIN
  PERFORM 1 FROM public.love_cycle_excluded_cards LIMIT 1;
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN
  RAISE EXCEPTION 'Authenticated client accessed private exclusion table directly';
 END IF;
END;
$test$;
RESET ROLE;

-- A legitimate authenticated token from another couple still has no access.
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
SET ROLE authenticated;
DO $test$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM 1 FROM public.my_love_cycle_exclusions('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
 EXCEPTION WHEN others THEN
  IF SQLERRM LIKE 'Accès au duo refusé%' THEN denied:=true; ELSE RAISE; END IF;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Unrelated user could list a couple exclusion'; END IF;
END;
$test$;
RESET ROLE;

-- Anonymous clients must not be able to invoke private game RPCs at all.
SELECT set_config('request.jwt.claim.sub','',false);
SET ROLE anon;
DO $test$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM public.love_redraw_capabilities('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Anonymous user can execute redraw capability RPC'; END IF;
END;
$test$;
RESET ROLE;

SELECT 'LR015_REAL_PG_ROLE_PERMISSIONS_OK' AS result;
