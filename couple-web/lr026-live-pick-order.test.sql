-- LR-026 integration of the actual ORDER BY rank ASC, random() LIMIT 1
-- against the normal D100 eligible-card candidate pattern (PostgreSQL CI only).
-- No real Supabase RPC is called; tests the modified ordering expression
-- and the exclusion before ranking on a disposable fixture.
BEGIN;

-- Fixed fabricated couple and evening; the entire fixture is rolled back.
INSERT INTO public.love_base_challenges(category,card_id,title,description)
SELECT 'SENSUEL', g,
       CASE WHEN g=99 THEN 'Invitation spéciale à deux'
            ELSE 'Carte originale '||g END,
       'Description originale carte '||g
FROM pg_catalog.generate_series(3,100) g
ON CONFLICT(category,card_id) DO UPDATE
 SET title=EXCLUDED.title, description=EXCLUDED.description;

INSERT INTO public.couple_challenges(
 couple_id,session_id,category,card_id,card_title,card_description
)
SELECT 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'::uuid,
       '77777777-7777-4777-8777-777777777777'::uuid,
       'SENSUEL',g,
       CASE WHEN g=1 THEN 'Invitation spéciale à deux'
            ELSE 'Historique original '||g END,
       'Une description déjà jouée '||g
FROM pg_catalog.generate_series(1,50) g;

DO $lr026_pick_order$
DECLARE
 couple uuid:='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
 evening uuid:='77777777-7777-4777-8777-777777777777';
 picked integer;
 picks integer[]:=ARRAY[]::integer[];
 attempts integer;
 candidate_count integer;
BEGIN
  -- A semantic twin of an already-played card should be deprioritized
  -- (not forbidden). There are 49 other eligible cards with rank zero.
  IF couple_private.love_variety_rank(evening,couple,'SENSUEL',99)<>1
     OR couple_private.love_variety_rank(evening,couple,'SENSUEL',100)<>0
  THEN
    RAISE EXCEPTION 'LR-026 pick: semantic twin test fixture is incorrect';
  END IF;
  SELECT count(*) INTO candidate_count
  FROM pg_catalog.generate_series(1,100) AS eligible(card)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.couple_challenges seen
    WHERE seen.session_id=evening AND seen.couple_id=couple
      AND seen.category='SENSUEL' AND seen.card_id=eligible.card);
  IF candidate_count<>50 THEN
    RAISE EXCEPTION 'LR-026 pick: expected 50 eligible cards, got %',
       candidate_count;
  END IF;

  FOR attempts IN 1..25 LOOP
    SELECT eligible.card INTO picked
    FROM pg_catalog.generate_series(1,100) AS eligible(card)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.couple_challenges seen
      WHERE seen.session_id=evening AND seen.couple_id=couple
        AND seen.category='SENSUEL' AND seen.card_id=eligible.card)
    ORDER BY couple_private.love_variety_rank(
       evening,couple,'SENSUEL',eligible.card) ASC, random()
    LIMIT 1;
    IF picked IS NULL OR picked<=50 OR picked=99 OR
       couple_private.love_variety_rank(
         evening,couple,'SENSUEL',picked)<>0
    THEN
      RAISE EXCEPTION 'LR-026 pick: noneligible or semantically deprioritized card picked %',
        picked;
    END IF;
  END LOOP;
  RAISE NOTICE
    'LR-026 pick: all 25 ranked draws favored eligible novel cards over semantic twin';

  -- All 50 eligible cards now share a seen title. No novel-ranked card
  -- remains; the original random() tie-breaker MUST still choose a card.
  UPDATE public.love_base_challenges
     SET title='Invitation spéciale à deux'
   WHERE category='SENSUEL' AND card_id BETWEEN 51 AND 100;
  FOR attempts IN 1..25 LOOP
    SELECT eligible.card INTO picked
    FROM pg_catalog.generate_series(1,100) AS eligible(card)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.couple_challenges seen
      WHERE seen.session_id=evening AND seen.couple_id=couple
        AND seen.category='SENSUEL' AND seen.card_id=eligible.card)
    ORDER BY couple_private.love_variety_rank(
       evening,couple,'SENSUEL',eligible.card) ASC, random()
    LIMIT 1;
    IF picked IS NULL OR picked<=50 OR
       couple_private.love_variety_rank(
        evening,couple,'SENSUEL',picked)<>1 THEN
      RAISE EXCEPTION 'LR-026 pick: exhausted semantic fallback failed on %',
        picked;
    END IF;
    picks:=pg_catalog.array_append(picks,picked);
  END LOOP;
  SELECT count(*) INTO candidate_count
  FROM (SELECT DISTINCT x FROM pg_catalog.unnest(picks) AS x) q;
  IF candidate_count<2 THEN
    RAISE EXCEPTION 'LR-026 pick: random tie-breaker produced no variety';
  END IF;
  RAISE NOTICE
    'LR-026 pick: all 25 exhausted-ranked draws stayed eligible, with % distinct choices',
    candidate_count;
END; $lr026_pick_order$;

ROLLBACK;
