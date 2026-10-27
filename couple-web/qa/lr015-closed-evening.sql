-- Test stale timer or cached UI response after a night has closed.
\set ON_ERROR_STOP on
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
INSERT INTO public.couple_sessions(id,couple_id,opened_by,starting_user_id,finished_at,counted)
VALUES('84848484-8484-4484-8484-848484848484',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '11111111-1111-4111-8111-111111111111',
 '11111111-1111-4111-8111-111111111111',
 now(),true);
INSERT INTO public.couple_challenges
 (id,session_id,couple_id,offered_by,recipient,category,face,card_id,status)
VALUES
 ('81818181-8181-4181-8181-818181818181',
  '84848484-8484-4484-8484-848484848484',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111','SENSUEL',12,1,'accepted'),
 ('82828282-8282-4282-8282-828282828282',
  '84848484-8484-4484-8484-848484848484',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111','SENSUEL',13,2,'proposed');
DO $test$
DECLARE denied int:=0;
BEGIN
 BEGIN
  PERFORM public.answer_challenge('81818181-8181-4181-8181-818181818181','completed');
 EXCEPTION WHEN others THEN
  IF SQLERRM LIKE 'Cette soirée est clôturée%' THEN denied:=denied+1;
  ELSE RAISE; END IF;
 END;
 BEGIN
  PERFORM public.answer_challenge('82828282-8282-4282-8282-828282828282','accepted');
 EXCEPTION WHEN others THEN
  IF SQLERRM LIKE 'Cette soirée est clôturée%' THEN denied:=denied+1;
  ELSE RAISE; END IF;
 END;
 BEGIN
  PERFORM public.answer_challenge('81818181-8181-4181-8181-818181818181','passed');
 EXCEPTION WHEN others THEN
  IF SQLERRM LIKE 'Cette soirée est clôturée%' THEN denied:=denied+1;
  ELSE RAISE; END IF;
 END;
 IF denied<>3 THEN RAISE EXCEPTION 'Closed-night responses not all denied: %',denied; END IF;
 IF (SELECT count(*) FROM public.couple_challenges
     WHERE session_id='84848484-8484-4484-8484-848484848484'
       AND status='completed')<>0 THEN
  RAISE EXCEPTION 'A stale client completed a closed-night challenge';END IF;
 IF (SELECT count(*) FROM public.couple_challenges
     WHERE id='81818181-8181-4181-8181-818181818181' AND status='accepted')<>1 THEN
  RAISE EXCEPTION 'A closed-night challenge was mutated';END IF;
 IF EXISTS(SELECT 1 FROM public.love_challenge_redraws
  WHERE origin_id='81818181-8181-4181-8181-818181818181') THEN
  RAISE EXCEPTION 'Closed-night pass created a replacement';END IF;
END;
$test$;
SELECT 'LR015_CLOSED_EVENING_STALE_CLIENT_BLOCKED' AS result;
