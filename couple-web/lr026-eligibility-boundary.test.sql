-- LR-026: representative eligibility boundaries on disposable PostgreSQL.
-- Models the EXISTING server candidate WHERE filters and checks that
-- variety ORDER BY cannot resurrect forbidden candidates.
-- Synthetic flags are NOT replacements for production Auth/RLS or LR-019.
BEGIN;
CREATE TEMP TABLE lr026_candidate_eligibility (
  card integer PRIMARY KEY,
  category text NOT NULL,
  role_allowed boolean NOT NULL,
  cycle_excluded boolean NOT NULL,
  already_in_bag_history boolean NOT NULL,
  already_drawn_for_recipient_tonight boolean NOT NULL,
  future_favorite boolean NOT NULL
) ON COMMIT DROP;

-- The original game has already shown card 1 to one partner tonight.
-- 3 is a custom near-duplicate; 2 is a genuinely new allowed card.
-- 4-8 are deliberately excluded for various independent reasons.
INSERT INTO lr026_candidate_eligibility
 (card,category,role_allowed,cycle_excluded,
  already_in_bag_history,already_drawn_for_recipient_tonight,future_favorite)
VALUES
 (1,'SENSUEL',true,false,false,false,false),
 (2,'SENSUEL',true,false,false,false,false),
 (3,'SENSUEL',true,false,false,false,false),
 (4,'SENSUEL',true,true,false,false,true),
 (5,'SENSUEL',false,false,false,false,true),
 (6,'SENSUEL',true,false,true,false,true),
 (7,'SENSUEL',true,false,false,true,true),
 (8,'SEXUEL',true,false,false,false,true);

DO $lr026_eligibility$
DECLARE
  a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  tonight uuid := '11111111-1111-4111-8111-111111111111';
  selected integer;
  allowed integer[];
BEGIN
  -- The rank changes the ORDER of a prefiltered pool, NOT its membership.
  SELECT pg_catalog.array_agg(card ORDER BY card) INTO allowed
  FROM lr026_candidate_eligibility c
  WHERE c.category='SENSUEL'
    AND c.role_allowed AND NOT c.cycle_excluded
    AND NOT c.already_in_bag_history
    AND NOT c.already_drawn_for_recipient_tonight;
  IF allowed IS DISTINCT FROM ARRAY[1,2,3] THEN
    RAISE EXCEPTION 'LR-026: model eligibility pool unexpectedly changed: %',
      allowed;
  END IF;

  SELECT c.card INTO selected
  FROM lr026_candidate_eligibility c
  WHERE c.category='SENSUEL'
    AND c.role_allowed AND NOT c.cycle_excluded
    AND NOT c.already_in_bag_history
    AND NOT c.already_drawn_for_recipient_tonight
  ORDER BY couple_private.love_variety_rank(
     tonight,a,c.category,c.card),pg_catalog.random()
  LIMIT 1;
  IF selected IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'LR-026: a forbidden or repeated card outranked card 2 (got %)',selected;
  END IF;

  -- Future-favorite cards are not an exemption from role/cycle/same-night
  -- restrictions, no matter how much the user likes the card.
  IF EXISTS (
    SELECT 1 FROM lr026_candidate_eligibility c
    WHERE c.future_favorite
      AND c.category='SENSUEL'
      AND c.role_allowed AND NOT c.cycle_excluded
      AND NOT c.already_in_bag_history
      AND NOT c.already_drawn_for_recipient_tonight
  ) THEN
    RAISE EXCEPTION 'LR-026: a forbidden future-favorite bypassed eligibility';
  END IF;

  -- With only two similar cards authorized, a valid redraw still occurs.
  UPDATE lr026_candidate_eligibility SET cycle_excluded=true WHERE card=2;
  SELECT c.card INTO selected
  FROM lr026_candidate_eligibility c
  WHERE c.category='SENSUEL'
    AND c.role_allowed AND NOT c.cycle_excluded
    AND NOT c.already_in_bag_history
    AND NOT c.already_drawn_for_recipient_tonight
  ORDER BY couple_private.love_variety_rank(
     tonight,a,c.category,c.card),pg_catalog.random()
  LIMIT 1;
  IF selected NOT IN (1,3) OR selected IS NULL THEN
    RAISE EXCEPTION 'LR-026: a valid all-similar redraw was blocked';
  END IF;

  -- No eligible candidates must stay empty; variety cannot override the
  -- existing RPC's no-card/atomic pass-or-refuse rollback behavior.
  UPDATE lr026_candidate_eligibility SET cycle_excluded=true WHERE card IN (1,3);
  SELECT c.card INTO selected
  FROM lr026_candidate_eligibility c
  WHERE c.category='SENSUEL'
    AND c.role_allowed AND NOT c.cycle_excluded
    AND NOT c.already_in_bag_history
    AND NOT c.already_drawn_for_recipient_tonight
  ORDER BY couple_private.love_variety_rank(
     tonight,a,c.category,c.card),pg_catalog.random()
  LIMIT 1;
  IF selected IS NOT NULL THEN
    RAISE EXCEPTION 'LR-026: a candidate was resurrected from an empty pool';
  END IF;
END; $lr026_eligibility$;
ROLLBACK;
