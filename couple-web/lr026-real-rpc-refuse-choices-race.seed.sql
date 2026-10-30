-- CI-only: concurrent Refuser decisions on the SAME challenge,
-- one choosing cycle exclusion and the other keeping the card eligible
-- for a future night. Both outcomes must serialize to ONE immutable receipt.
-- Disposable PostgreSQL 17; fabricated couple and user identities.
INSERT INTO public.couples(
 id,owner_user_id,monthly_pass_limit,
 category_preference_percent,sexual_card_mode
) VALUES (
 '99999999-aaaa-4888-8888-999999998888',
 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
 1,100,'custom');
INSERT INTO public.couple_members(couple_id,user_id) VALUES
 ('99999999-aaaa-4888-8888-999999998888',
  'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'),
 ('99999999-aaaa-4888-8888-999999998888',
  'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb');
INSERT INTO public.couple_sessions(id,couple_id,opened_by)
VALUES (
 '99999999-bbbb-4888-8888-999999998888',
 '99999999-aaaa-4888-8888-999999998888',
 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa');
INSERT INTO public.couple_challenges(
 id,session_id,couple_id,offered_by,recipient,
 category,face,card_id,card_title,card_description,status)
VALUES (
 '99999999-cccc-4888-8888-999999998888',
 '99999999-bbbb-4888-8888-999999998888',
 '99999999-aaaa-4888-8888-999999998888',
 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb',
 'SENSUEL',1,1,'Synthetic undecided challenge',
 'Challenge to race Passer against Refuser','proposed');
