-- CI-only: one real pending D100 for B and one simultaneous
-- A draw vs B pass. Both real RPCs lock the same synthetic couple.
-- No production connection, Auth sessions or user content.
INSERT INTO public.couples(id,owner_user_id,monthly_pass_limit,
 category_preference_percent,category_weights_enabled,sexual_card_mode)
VALUES(
 '77777777-aaaa-4777-8777-777777777777',
 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
 1,100,true,'custom');

INSERT INTO public.couple_members(couple_id,user_id) VALUES
 ('77777777-aaaa-4777-8777-777777777777',
  'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'),
 ('77777777-aaaa-4777-8777-777777777777',
  'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb');

INSERT INTO public.couple_sessions(id,couple_id,opened_by,
 paired_turns,self_draws)
VALUES(
 '77777777-bbbb-4777-8777-777777777777',
 '77777777-aaaa-4777-8777-777777777777',
 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
 false,false);

INSERT INTO public.couple_personal_rolls(session_id,user_id,face)
VALUES
 ('77777777-bbbb-4777-8777-777777777777',
  'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',2),
 ('77777777-bbbb-4777-8777-777777777777',
  'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb',2);

INSERT INTO public.couple_challenges(
 id,session_id,couple_id,offered_by,recipient,category,
 face,card_id,card_title,card_description,status)
VALUES(
 '77777777-cccc-4777-8777-777777777777',
 '77777777-bbbb-4777-8777-777777777777',
 '77777777-aaaa-4777-8777-777777777777',
 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb',
 'SENSUEL',1,1,'Original fabricated card',
 'Synthetic concurrent draw/pass fixture','proposed');

DO $lr026_mixed_seed$
BEGIN
 IF (SELECT count(*) FROM public.couple_challenges
     WHERE couple_id='77777777-aaaa-4777-8777-777777777777')<>1
    OR (SELECT count(*) FROM public.couple_personal_rolls
     WHERE session_id='77777777-bbbb-4777-8777-777777777777')<>2
 THEN
  RAISE EXCEPTION 'LR-026 mixed draw/pass fixture invalid';
 END IF;
END; $lr026_mixed_seed$;
