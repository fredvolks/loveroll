-- LR-015: a cached client using answer_challenge(...,'passed') must
-- create exactly one replacement, and preserve quota and consent rules.
\set ON_ERROR_STOP on
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
INSERT INTO public.couple_sessions(id,couple_id,opened_by,starting_user_id)
 VALUES ('abababab-abab-4bab-8bab-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '11111111-1111-4111-8111-111111111111',
 '11111111-1111-4111-8111-111111111111');
UPDATE public.couples SET monthly_pass_limit=2
 WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
INSERT INTO public.couple_challenges
(id,session_id,couple_id,offered_by,recipient,category,face,card_id,status)
VALUES
 ('01010101-0101-4101-8101-010101010101',
  'abababab-abab-4bab-8bab-111111111111',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'SENSUEL',36,21,'proposed'),
 ('02020202-0202-4202-8202-020202020202',
  'abababab-abab-4bab-8bab-111111111111',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'SENSUEL',37,22,'proposed');
DO $test$
DECLARE repl uuid; denied boolean:=false;
BEGIN
 PERFORM public.answer_challenge('01010101-0101-4101-8101-010101010101','passed');
 SELECT replacement_id INTO repl FROM public.love_challenge_redraws
 WHERE origin_id='01010101-0101-4101-8101-010101010101';
 IF repl IS NULL THEN RAISE EXCEPTION 'Legacy Pass bypassed atomic replacement'; END IF;
 IF (SELECT count(*) FROM public.couple_challenges
      WHERE id='01010101-0101-4101-8101-010101010101'
        AND status='passed' AND passed_at IS NOT NULL)<>1 THEN
  RAISE EXCEPTION 'Legacy Pass failed to stamp one pass'; END IF;
 IF (SELECT count(*) FROM public.love_challenge_redraws
      WHERE origin_id='01010101-0101-4101-8101-010101010101')<>1 THEN
  RAISE EXCEPTION 'Legacy Pass produced multiple replacement records'; END IF;
 PERFORM public.answer_challenge('01010101-0101-4101-8101-010101010101','passed');
 IF (SELECT count(*) FROM public.love_challenge_redraws
      WHERE origin_id='01010101-0101-4101-8101-010101010101')<>1 THEN
  RAISE EXCEPTION 'Legacy retry created duplicate redraw'; END IF;
 -- The ordinary LP quota already had one recorded pass, so this reaches 2/2.
 BEGIN
  PERFORM public.answer_challenge('02020202-0202-4202-8202-020202020202','passed');
 EXCEPTION WHEN others THEN
  IF SQLERRM LIKE 'Limite mensuelle de passes%' THEN denied:=true;
  ELSE RAISE; END IF;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Old client bypassed shared 2/2 quota'; END IF;
 IF (SELECT count(*) FROM public.couple_challenges
     WHERE id='02020202-0202-4202-8202-020202020202'
       AND status='proposed')<>1 THEN
  RAISE EXCEPTION 'Quota exception mutated original challenge'; END IF;
END;
$test$;
SELECT 'LR015_LEGACY_ATOMIC_OK' AS result;
