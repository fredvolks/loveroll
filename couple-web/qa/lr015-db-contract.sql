-- PostgreSQL-level behavior checks, on deliberately fake accounts only.
\set ON_ERROR_STOP on
INSERT INTO auth.users VALUES
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222'),
 ('33333333-3333-4333-8333-333333333333');
INSERT INTO public.couples(id,owner_user_id,monthly_pass_limit)
VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111',1);
INSERT INTO public.couple_members VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111'),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222');
INSERT INTO public.couple_sessions(id,couple_id,opened_by,starting_user_id)
VALUES('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
'11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111');
INSERT INTO public.couple_personal_rolls VALUES
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111',3),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222',2);
INSERT INTO public.couple_challenges(id,session_id,couple_id,offered_by,recipient,category,face,card_id,card_title,status)
VALUES
('cccccccc-cccc-4ccc-8ccc-cccccccccccc','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222',
'11111111-1111-4111-8111-111111111111','SENSUEL',12,1,'Original refus', 'accepted'),
('dddddddd-dddd-4ddd-8ddd-dddddddddddd','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222',
'11111111-1111-4111-8111-111111111111','SENSUEL',24,4,'Original passe','accepted'),
('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222',
'11111111-1111-4111-8111-111111111111','SENSUEL',25,15,'Non terminé','accepted');
INSERT INTO public.love_card_draw_history VALUES
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','SENSUEL',1),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','SENSUEL',4),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','SENSUEL',15);
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
DO $test$
DECLARE first jsonb; repeated jsonb; passed jsonb; new_card uuid;
BEGIN
 first:=public.love_respond_and_redraw('cccccccc-cccc-4ccc-8ccc-cccccccccccc','refuse',true);
 IF first->>'action'<>'refuse' OR (first->>'excluded')::boolean IS DISTINCT FROM true
    OR first->>'replacement_id' IS NULL THEN
  RAISE EXCEPTION 'Refusal did not create replacement: %',first; END IF;
 new_card:=(first->>'replacement_id')::uuid;
 IF (SELECT count(*) FROM public.couple_challenges WHERE id=new_card
      AND replaces_challenge_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc')<>1 THEN
  RAISE EXCEPTION 'Replacement lost original D6 slot'; END IF;
 IF (SELECT count(*) FROM public.couple_challenges WHERE id=new_card
     AND recipient='11111111-1111-4111-8111-111111111111'
     AND category='SENSUEL' AND card_id<>1)<>1 THEN
  RAISE EXCEPTION 'Replacement changed recipient/category or repeated card'; END IF;
 repeated:=public.love_respond_and_redraw('cccccccc-cccc-4ccc-8ccc-cccccccccccc','refuse',false);
 IF repeated->>'replacement_id'<>first->>'replacement_id'
    OR (repeated->>'already_processed')::boolean IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'Retry created duplicate: %',repeated; END IF;
 IF (SELECT count(*) FROM public.love_challenge_redraws WHERE origin_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc')<>1 THEN
  RAISE EXCEPTION 'Duplicate redraw ledger'; END IF;
 IF (SELECT count(*) FROM public.love_cycle_excluded_cards
      WHERE couple_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      AND category='SENSUEL' AND card_id=1)<>1 THEN
  RAISE EXCEPTION 'Refusal did not exclude card for cycle'; END IF;
 passed:=public.love_respond_and_redraw('dddddddd-dddd-4ddd-8ddd-dddddddddddd','pass',false);
 IF (passed->>'action')<>'pass' THEN RAISE EXCEPTION 'Pass failed';END IF;
 IF (SELECT count(*) FROM public.couple_challenges
      WHERE id='dddddddd-dddd-4ddd-8ddd-dddddddddddd' AND status='passed' AND passed_at IS NOT NULL)<>1 THEN
  RAISE EXCEPTION 'Pass stamp or quota not applied'; END IF;
 IF (SELECT count(*) FROM public.love_card_draw_history
      WHERE couple_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
        AND card_id=4)<>0 THEN RAISE EXCEPTION 'Pass card not released'; END IF;
END
$test$;
-- Confirm the next pass is denied, but a refusal remains possible.
INSERT INTO public.couple_challenges(id,session_id,couple_id,offered_by,recipient,category,face,card_id,status)
VALUES('ffffffff-ffff-4fff-8fff-ffffffffffff','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222',
'11111111-1111-4111-8111-111111111111','SENSUEL',29,6,'proposed');
DO $test$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM public.love_respond_and_redraw('ffffffff-ffff-4fff-8fff-ffffffffffff','pass',false);
 EXCEPTION WHEN others THEN
  IF SQLERRM LIKE 'Limite mensuelle de passes%' THEN denied:=true; ELSE RAISE; END IF;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Monthly limit bypassed'; END IF;
 PERFORM public.love_respond_and_redraw('ffffffff-ffff-4fff-8fff-ffffffffffff','refuse',false);
END
$test$;
-- A stranger may not replay a legitimate couple member's challenge.
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
DO $test$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM public.love_respond_and_redraw('cccccccc-cccc-4ccc-8ccc-cccccccccccc','refuse',true);
 EXCEPTION WHEN others THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Cross-couple access was allowed'; END IF;
END
$test$;
-- Once a past completed card exists in the current cycle, incomplete closure
-- must not release its history mark.
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
INSERT INTO public.couple_sessions(id,couple_id,opened_by,finished_at,counted,started_at)
VALUES('99999999-9999-4999-8999-999999999999','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
'11111111-1111-4111-8111-111111111111',now(),true,now()-interval '1 day');
INSERT INTO public.couple_challenges(session_id,couple_id,offered_by,recipient,category,face,card_id,status)
VALUES('99999999-9999-4999-8999-999999999999','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
'22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111',
'SENSUEL',78,15,'completed');
UPDATE public.couple_sessions SET finished_at=now(),counted=false
WHERE id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
DO $test$
BEGIN
 IF (SELECT count(*) FROM public.love_card_draw_history
     WHERE couple_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
     AND card_id=15)<>1 THEN
  RAISE EXCEPTION 'A completed card in this cycle was wrongly recycled';END IF;
 IF (SELECT count(*) FROM public.love_card_draw_history
     WHERE couple_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
     AND card_id=1)<>0 THEN
  RAISE EXCEPTION 'Uncompleted card was not recycled after manual closure';END IF;
 IF (SELECT count(*) FROM public.couple_challenges
     WHERE id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' AND status='accepted')<>1 THEN
  RAISE EXCEPTION 'Closure changed immutable challenge occurrence';END IF;
END
$test$;
SELECT 'LR015_POSTGRES_ISOLATED_SUCCESS' AS result;
