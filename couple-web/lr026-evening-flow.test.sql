-- LR-026 evening selection integration tests in disposable PostgreSQL 17 only.
-- This fixture checks the REAL migration helper and the SQL ORDER BY strategy,
-- not an authenticated two-partner production RPC flow.
-- Every synthetic history insert is rolled back.
BEGIN;
DO $lr026_flow_test$
DECLARE
  a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  b uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  tonight uuid := '11111111-1111-4111-8111-111111111111';
  next_evening uuid := '22222222-2222-4222-8222-222222222222';
  selected integer;
BEGIN
  -- Same D100 category: the unused distinct card must win over both
  -- an already-drawn card and a customized near-duplicate.
  SELECT eligible.card_id INTO selected
  FROM (VALUES (1),(2),(3)) AS eligible(card_id)
  ORDER BY couple_private.love_variety_rank(
    tonight,a,'SENSUEL',eligible.card_id),random()
  LIMIT 1;
  IF selected IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'LR-026: new card lost to repeated or similar content';
  END IF;

  -- In a pool containing ONLY repeats, ordering must still return a card.
  SELECT eligible.card_id INTO selected
  FROM (VALUES (1),(3)) AS eligible(card_id)
  ORDER BY couple_private.love_variety_rank(
    tonight,a,'SENSUEL',eligible.card_id),random()
  LIMIT 1;
  IF selected IS NULL OR selected NOT IN (1,3) THEN
    RAISE EXCEPTION 'LR-026: all-similar fallback blocked the D100';
  END IF;

  -- Identical text in the other official category must NOT count as repeat.
  IF couple_private.love_variety_rank(tonight,a,'SEXUEL',4)<>0 THEN
    RAISE EXCEPTION 'LR-026: a Sensuel history item contaminated Sexuel';
  END IF;

  -- Two partners/couples may have the same session UUID in test data;
  -- no other couple's history may influence this couple's ranking.
  INSERT INTO public.couple_challenges(
      couple_id,session_id,category,card_id,card_title,card_description)
  VALUES (b,tonight,'SENSUEL',2,
          'Une danse au salon','Choisissez une chanson et dansez ensemble');
  IF couple_private.love_variety_rank(tonight,a,'SENSUEL',2)<>0 THEN
    RAISE EXCEPTION 'LR-026: a different couple biased the current selection';
  END IF;
  IF couple_private.love_variety_rank(tonight,b,'SENSUEL',2)<>1 THEN
    RAISE EXCEPTION 'LR-026: the other couple lost its own draw history';
  END IF;

  -- Synthetic 200-card cycle: after 199 unique cards have been shown,
  -- the final eligible unseen card must win, not a previously seen card.
  INSERT INTO public.love_base_challenges(category,card_id,title,description)
  SELECT 'SENSUEL',g,'Séquence '||g,'Variante '||g
  FROM generate_series(10,209) AS g;
  INSERT INTO public.couple_challenges(
       couple_id,session_id,category,card_id,card_title,card_description)
  SELECT a,tonight,'SENSUEL',g,'Séquence '||g,'Variante '||g
  FROM generate_series(10,208) AS g;

  IF couple_private.love_variety_rank(tonight,a,'SENSUEL',209)<>0 THEN
    RAISE EXCEPTION 'LR-026: card 200 is incorrectly classified as seen';
  END IF;
  SELECT eligible.card_id INTO selected
  FROM generate_series(10,209) AS eligible(card_id)
  ORDER BY couple_private.love_variety_rank(
    tonight,a,'SENSUEL',eligible.card_id),random()
  LIMIT 1;
  IF selected IS DISTINCT FROM 209 THEN
    RAISE EXCEPTION 'LR-026: simulated 200-card cycle skipped its final new card';
  END IF;

  -- In a new session the same card is again novel; prior evening's
  -- 199 history entries must not leak into this evening.
  IF couple_private.love_variety_rank(next_evening,a,'SENSUEL',10)<>0 THEN
    RAISE EXCEPTION 'LR-026: old evening history leaked into a new evening';
  END IF;

  -- Exhausted cycle: all 200 cards are now drawn. No hard exclusion was
  -- introduced, so the authorized candidate query still returns a card.
  INSERT INTO public.couple_challenges(
      couple_id,session_id,category,card_id,card_title,card_description)
  VALUES (a,tonight,'SENSUEL',209,'Séquence 209','Variante 209');
  IF couple_private.love_variety_rank(tonight,a,'SENSUEL',209)<>1 THEN
    RAISE EXCEPTION 'LR-026: 200th card was not recorded as repeat';
  END IF;
  SELECT eligible.card_id INTO selected
  FROM generate_series(10,209) AS eligible(card_id)
  ORDER BY couple_private.love_variety_rank(
    tonight,a,'SENSUEL',eligible.card_id),random()
  LIMIT 1;
  IF selected IS NULL OR selected NOT BETWEEN 10 AND 209 THEN
    RAISE EXCEPTION 'LR-026: exhausted 200-card cycle failed to fall back';
  END IF;
END; $lr026_flow_test$;
ROLLBACK;
