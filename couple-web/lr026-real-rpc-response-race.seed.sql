-- Disposable fixture for a *single* real challenge simultaneously
-- answered with Passer and Refuser. Only one decision may be recorded;
-- the second call must replay the winner's receipt.
INSERT INTO public.couples(
 id,owner_user_id,monthly_pass_limit,
 category_preference_percent,sexual_card_mode
) VALUES (
 '88888888-aaaa-4888-8888-888888888888',
 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
 1,100,'custom');
INSERT INTO public.couple_members(couple_id,user_id) VALUES
 ('88888888-aaaa-4888-8888-888888888888',
  'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'),
 ('88888888-aaaa-4888-8888-888888888888',
  'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb');
INSERT INTO public.couple_sessions(id,couple_id,opened_by)
VALUES (
 '88888888-bbbb-4888-8888-888888888888',
 '88888888-aaaa-4888-8888-888888888888',
 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa');
INSERT INTO public.couple_challenges(
 id,session_id,couple_id,offered_by,recipient,
 category,face,card_id,card_title,card_description,status)
VALUES (
 '88888888-cccc-4888-8888-888888888888',
 '88888888-bbbb-4888-8888-888888888888',
 '88888888-aaaa-4888-8888-888888888888',
 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb',
 'SENSUEL',1,1,'Synthetic undecided challenge',
 'Challenge to race Passer against Refuser','proposed');
