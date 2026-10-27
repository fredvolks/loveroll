-- LR-015: exhausted pool MUST leave original, quota, history, and
-- exclusions untouched; every mutation occurs in the same DB transaction.
\set ON_ERROR_STOP on
BEGIN;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
UPDATE public.couples SET monthly_pass_limit=30
 WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
INSERT INTO public.couple_sessions(id,couple_id,opened_by,starting_user_id)
 VALUES('eeeeeeee-3333-4333-8333-eeeeeeeeeeee',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '11111111-1111-4111-8111-111111111111',
 '11111111-1111-4111-8111-111111111111');
INSERT INTO public.couple_challenges
(id,session_id,couple_id,offered_by,recipient,category,card_id,face,status)
VALUES('eeeeeeee-4444-4444-8444-eeeeeeeeeeee',
 'eeeeeeee-3333-4333-8333-eeeeeeeeeeee',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '22222222-2222-4222-8222-222222222222',
 '11111111-1111-4111-8111-111111111111',
 'SENSUEL',21,21,'proposed');
-- Exclude the 25 actual base cards for the current cycle; the fixture
-- defines no custom cards. A valid replacement must therefore be impossible.
INSERT INTO public.love_cycle_excluded_cards
 (couple_id,cycle_number,category,card_id,excluded_by)
SELECT 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 1,'SENSUEL',n,'11111111-1111-4111-8111-111111111111'::uuid
FROM generate_series(1,25) n
ON CONFLICT DO NOTHING;
DO $test$
DECLARE refused boolean:=false; passed boolean:=false; used_before integer; used_after integer;
BEGIN
 SELECT count(*) INTO used_before
 FROM public.couple_challenges WHERE couple_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
 AND recipient='11111111-1111-4111-8111-111111111111' AND status='passed';
 BEGIN
  PERFORM public.love_respond_and_redraw('eeeeeeee-4444-4444-8444-eeeeeeeeeeee','refuse',true);
 EXCEPTION WHEN others THEN
  IF SQLERRM LIKE 'Aucun autre défi admissible%' THEN refused:=true;
  ELSE RAISE; END IF;
 END;
 IF NOT refused THEN RAISE EXCEPTION 'Exhausted refusal was incorrectly accepted';END IF;
 BEGIN
  PERFORM public.love_respond_and_redraw('eeeeeeee-4444-4444-8444-eeeeeeeeeeee','pass',false);
 EXCEPTION WHEN others THEN
  IF SQLERRM LIKE 'Aucun autre défi admissible%' THEN passed:=true;
  ELSE RAISE; END IF;
 END;
 IF NOT passed THEN RAISE EXCEPTION 'Exhausted pass was incorrectly accepted';END IF;
 SELECT count(*) INTO used_after
 FROM public.couple_challenges WHERE couple_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
 AND recipient='11111111-1111-4111-8111-111111111111' AND status='passed';
 IF used_before<>used_after THEN RAISE EXCEPTION 'Exhausted pool debited a pass';END IF;
 IF (SELECT count(*) FROM public.couple_challenges
      WHERE id='eeeeeeee-4444-4444-8444-eeeeeeeeeeee'
      AND status='proposed' AND passed_at IS NULL AND refused_at IS NULL)<>1
 THEN RAISE EXCEPTION 'Exhausted pool mutated original challenge';END IF;
 IF EXISTS(SELECT 1 FROM public.love_challenge_redraws
   WHERE origin_id='eeeeeeee-4444-4444-8444-eeeeeeeeeeee')
 THEN RAISE EXCEPTION 'Exhausted pool created redraw ledger';END IF;
END;
$test$;
ROLLBACK;
SELECT 'LR015_EXHAUSTED_POOL_ROLLBACK_OK' AS result;
