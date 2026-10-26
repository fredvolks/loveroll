\set ON_ERROR_STOP on
-- Runs after LR-015 fixture/migrations, LR-019 core and draw compatibility.
-- Validates a real server draw with every normal shuffle marker present.
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
INSERT INTO public.couple_sessions(id,couple_id,opened_by,starting_user_id,self_draws,paired_turns,started_at)
VALUES('81818181-8181-4181-8181-818181818181',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '11111111-1111-4111-8111-111111111111',
 '11111111-1111-4111-8111-111111111111',
 true,true,now());
INSERT INTO public.couple_personal_rolls(session_id,user_id,face)
VALUES
 ('81818181-8181-4181-8181-818181818181','11111111-1111-4111-8111-111111111111',1),
 ('81818181-8181-4181-8181-818181818181','22222222-2222-4222-8222-222222222222',1);
INSERT INTO public.love_card_draw_history(couple_id,recipient_user_id,category,card_id)
SELECT 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '11111111-1111-4111-8111-111111111111',categories.category,n
FROM (VALUES('SENSUEL'),('SEXUEL')) AS categories(category),
generate_series(1,25) n ON CONFLICT DO NOTHING;
-- An old, completed card is marked before this new evening.
INSERT INTO public.love_couple_favorites(couple_id,category,card_id,marked_by,marked_at)
VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','SENSUEL',1,
'11111111-1111-4111-8111-111111111111',now()-interval '1 day');
DO $check$
DECLARE result public.couple_challenges;
BEGIN
 result:=public.draw_for_partner('81818181-8181-4181-8181-818181818181','SENSUEL',false);
 IF result.card_id<>1 OR result.category<>'SENSUEL'
    OR result.recipient<>'11111111-1111-4111-8111-111111111111' THEN
  RAISE EXCEPTION 'Replay did not select the eligible prior-evening favorite: %',result;
 END IF;
 IF (SELECT count(*) FROM public.love_card_draw_history
     WHERE couple_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      AND recipient_user_id='11111111-1111-4111-8111-111111111111')<>50 THEN
  RAISE EXCEPTION 'Official draw reset the 200-card shuffle history despite a replayable heart';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.couple_challenges
    WHERE id=result.id AND session_id='81818181-8181-4181-8181-818181818181') THEN
  RAISE EXCEPTION 'Official draw did not preserve the generated challenge';
 END IF;
END $check$;
SELECT 'LR019_FAVORITE_D100_POSTGRES_OK' AS result;
