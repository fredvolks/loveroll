-- CI-ONLY fake data for concurrent execution of the EXACT D100 RPC.
-- Kept separate from LR-026 pass-race couples and rolled into only disposable
-- lr026_real_rpc_test. Synthetic auth claims are set by the shell runner.
INSERT INTO public.couples(
 id,owner_user_id,monthly_pass_limit,category_preference_percent,
 category_weights_enabled,sexual_card_mode
) VALUES
 ('44444444-aaaa-4444-8444-444444444444',
  'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',1,100,true,'custom'),
 ('55555555-aaaa-4555-8555-555555555555',
  'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',1,100,true,'custom'),
 ('66666666-aaaa-4666-8666-666666666666',
  'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',1,100,true,'custom');

INSERT INTO public.couple_members(couple_id,user_id)
SELECT c.pair,u.actor
FROM (VALUES
 ('44444444-aaaa-4444-8444-444444444444'::uuid),
 ('55555555-aaaa-4555-8555-555555555555'::uuid),
 ('66666666-aaaa-4666-8666-666666666666'::uuid)
) AS c(pair)
CROSS JOIN (VALUES
 ('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'::uuid),
 ('bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb'::uuid)
) AS u(actor);

-- paired turns must allocate exactly A then B, blocking a duplicate A;
-- unpaired self mode permits A/B draws for different recipients;
-- old unpaired mode must reject two pending proposals for the same target.
INSERT INTO public.couple_sessions(
 id,couple_id,opened_by,paired_turns,starting_user_id,self_draws
) VALUES
 ('44444444-bbbb-4444-8444-444444444444',
  '44444444-aaaa-4444-8444-444444444444',
  'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
  true,'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',false),
 ('55555555-bbbb-4555-8555-555555555555',
  '55555555-aaaa-4555-8555-555555555555',
  'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
  false,NULL,true),
 ('66666666-bbbb-4666-8666-666666666666',
  '66666666-aaaa-4666-8666-666666666666',
  'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
  false,NULL,false);

INSERT INTO public.couple_personal_rolls(session_id,user_id,face)
SELECT s.id,u.actor,1::smallint
FROM (SELECT id FROM public.couple_sessions
      WHERE couple_id IN (
       '44444444-aaaa-4444-8444-444444444444',
       '55555555-aaaa-4555-8555-555555555555',
       '66666666-aaaa-4666-8666-666666666666')) s
CROSS JOIN (VALUES
 ('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'::uuid),
 ('bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb'::uuid)
) u(actor);

DO $lr026_draw_race_fixture$
BEGIN
 IF (SELECT count(*) FROM public.couple_personal_rolls
     WHERE session_id IN (
      '44444444-bbbb-4444-8444-444444444444',
      '55555555-bbbb-4555-8555-555555555555',
      '66666666-bbbb-4666-8666-666666666666'))<>6
    OR (SELECT count(*) FROM public.couple_challenges
        WHERE couple_id IN (
         '44444444-aaaa-4444-8444-444444444444',
         '55555555-aaaa-4555-8555-555555555555',
         '66666666-aaaa-4666-8666-666666666666'))<>0
 THEN RAISE EXCEPTION 'LR-026 synthetic concurrent draw fixture invalid'; END IF;
END; $lr026_draw_race_fixture$;
