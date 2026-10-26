\set ON_ERROR_STOP on
-- Synthetic cycle target=2 so a replayed heart exposes over-counting immediately.
CREATE TABLE IF NOT EXISTS public.love_cycle_responses (
 couple_id uuid NOT NULL,
 cycle_number integer NOT NULL,
 user_id uuid NOT NULL,
 choice text NOT NULL
);
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
UPDATE public.couples SET challenge_cycle_target=2,challenge_cycle_pending=false
WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
INSERT INTO public.couple_sessions(id,couple_id,opened_by,starting_user_id,self_draws,paired_turns,started_at)
VALUES('93939393-9393-4393-8393-939393939393',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '11111111-1111-4111-8111-111111111111',
 '11111111-1111-4111-8111-111111111111',
 true,true,now());
INSERT INTO public.couple_personal_rolls(session_id,user_id,face)
VALUES
 ('93939393-9393-4393-8393-939393939393','11111111-1111-4111-8111-111111111111',1),
 ('93939393-9393-4393-8393-939393939393','22222222-2222-4222-8222-222222222222',1);
INSERT INTO public.couple_challenges(session_id,couple_id,offered_by,recipient,category,face,card_id,status)
VALUES
 ('93939393-9393-4393-8393-939393939393','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111',
  'SENSUEL',1,1,'completed'),
 ('93939393-9393-4393-8393-939393939393','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',
  'SENSUEL',2,1,'completed');
SELECT public.finish_couple_session('93939393-9393-4393-8393-939393939393',true);
DO $dupes$
DECLARE progress jsonb;
BEGIN
 progress:=public.love_cycle_status('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
 IF (progress->>'completed')::integer<>1 THEN
  RAISE EXCEPTION 'Replayed favorite counted twice in shared cycle: %',progress;
 END IF;
 IF (SELECT challenge_cycle_pending FROM public.couples
   WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') THEN
  RAISE EXCEPTION 'Cycle pending too early: two completions but just one unique card';
 END IF;
END $dupes$;
-- A second counted night introduces a second distinct challenge.
INSERT INTO public.couple_sessions(id,couple_id,opened_by,starting_user_id,self_draws,paired_turns,started_at)
VALUES('94949494-9494-4494-8494-949494949494',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '11111111-1111-4111-8111-111111111111',
 '11111111-1111-4111-8111-111111111111',
 true,true,now());
INSERT INTO public.couple_personal_rolls(session_id,user_id,face)
VALUES
 ('94949494-9494-4494-8494-949494949494','11111111-1111-4111-8111-111111111111',1),
 ('94949494-9494-4494-8494-949494949494','22222222-2222-4222-8222-222222222222',1);
INSERT INTO public.couple_challenges(session_id,couple_id,offered_by,recipient,category,face,card_id,status)
VALUES
 ('94949494-9494-4494-8494-949494949494','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111',
  'SENSUEL',3,1,'completed'),
 ('94949494-9494-4494-8494-949494949494','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',
  'SENSUEL',4,2,'completed');
SELECT public.finish_couple_session('94949494-9494-4494-8494-949494949494',true);
DO $distinct$
DECLARE progress jsonb;
BEGIN
 progress:=public.love_cycle_status('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
 IF (progress->>'completed')::integer<>2 THEN
  RAISE EXCEPTION 'Distinct category/card pairs not counted: %',progress;
 END IF;
 IF NOT (SELECT challenge_cycle_pending FROM public.couples
   WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') THEN
  RAISE EXCEPTION 'Unique cycle threshold not reached after second distinct card';
 END IF;
END $distinct$;
SELECT 'LR019_200_UNIQUE_CYCLE_POSTGRES_OK' AS result;
