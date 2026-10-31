-- CI ONLY: concurrent execution of the *real* reviewed LoveRoll
-- love_respond_and_redraw RPC with multiple PostgreSQL client connections.
-- Fake actors, three separate couples, local PG17; no Supabase credentials.
-- Do not wrap this setup in a rollback: the parallel clients must see rows.
INSERT INTO public.couples (
  id, owner_user_id, monthly_pass_limit, challenge_cycle_number,
  challenge_cycle_started_at, sexual_card_mode
) VALUES
 ('11111111-aaaa-4111-8111-111111111111',
  'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',1,1,now()-interval '7 days','custom'),
 ('22222222-aaaa-4222-8222-222222222222',
  'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',1,1,now()-interval '7 days','custom'),
 ('33333333-aaaa-4333-8333-333333333333',
  'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',1,1,now()-interval '7 days','custom');
INSERT INTO public.couple_members(couple_id,user_id)
SELECT c.id, u.uid
FROM (VALUES
 ('11111111-aaaa-4111-8111-111111111111'::uuid),
 ('22222222-aaaa-4222-8222-222222222222'::uuid),
 ('33333333-aaaa-4333-8333-333333333333'::uuid)
) c(id)
CROSS JOIN (VALUES
 ('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'::uuid),
 ('bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb'::uuid)
) u(uid);

INSERT INTO public.couple_sessions(id,couple_id,opened_by,paired_turns)
VALUES
 ('11111111-bbbb-4111-8111-111111111111',
  '11111111-aaaa-4111-8111-111111111111',
  'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',true),
 ('22222222-bbbb-4222-8222-222222222222',
  '22222222-aaaa-4222-8222-222222222222',
  'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',true),
 ('33333333-bbbb-4333-8333-333333333333',
  '33333333-aaaa-4333-8333-333333333333',
  'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',true);
INSERT INTO public.love_base_challenges(
 category, card_id, title, description, timer_minutes
)
SELECT 'SENSUEL',g::smallint,
  'Défi concurrency fictif '||g,'Description synthétique '||g,3::smallint
FROM pg_catalog.generate_series(1,25) g;

-- Case 1: A receives two queued cards in the same evening. A may pass
-- only one of them in the calendar month, regardless of racing requests.
-- Case 2: A and B each have their own independent one-pass allowance.
-- Case 3: the same challenge is passed twice simultaneously (retry).
INSERT INTO public.couple_challenges(
 id, session_id, couple_id, offered_by, recipient,
 category, face, card_id, card_title, card_description
) VALUES
 ('11111111-cccc-4111-8111-111111111111',
  '11111111-bbbb-4111-8111-111111111111',
  '11111111-aaaa-4111-8111-111111111111',
  'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb',
  'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
  'SENSUEL',1,1,'Card 1','Fabricated source card 1'),
 ('11111111-dddd-4111-8111-111111111111',
  '11111111-bbbb-4111-8111-111111111111',
  '11111111-aaaa-4111-8111-111111111111',
  'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb',
  'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
  'SENSUEL',2,2,'Card 2','Fabricated source card 2'),
 ('22222222-cccc-4222-8222-222222222222',
  '22222222-bbbb-4222-8222-222222222222',
  '22222222-aaaa-4222-8222-222222222222',
  'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb',
  'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
  'SENSUEL',1,1,'Card 1','Fabricated source card 1'),
 ('22222222-dddd-4222-8222-222222222222',
  '22222222-bbbb-4222-8222-222222222222',
  '22222222-aaaa-4222-8222-222222222222',
  'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
  'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb',
  'SENSUEL',2,1,'Card 1','Fabricated source card 1'),
 ('33333333-cccc-4333-8333-333333333333',
  '33333333-bbbb-4333-8333-333333333333',
  '33333333-aaaa-4333-8333-333333333333',
  'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb',
  'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
  'SENSUEL',1,1,'Card 1','Fabricated source card 1');

-- Validate synthetic fixture shape before running real RPCs.
DO $lr026_seed$
BEGIN
  IF (SELECT count(*) FROM public.couple_challenges)<>5
     OR (SELECT count(*) FROM public.couple_members)<>6
     OR (SELECT count(*) FROM public.love_base_challenges)<>25
  THEN
    RAISE EXCEPTION 'LR-026 race fixture incomplete';
  END IF;
END;$lr026_seed$;
