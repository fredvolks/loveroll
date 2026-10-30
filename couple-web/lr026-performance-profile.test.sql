-- LR-026 performance profile; PostgreSQL 17 CI fixture ONLY.
-- Reproduces the old ranking logic in a transaction, compares all results
-- with the new exact-id-first rank, and prints measured elapsed times.
-- Timings are diagnostic, NOT flaky CI timing thresholds or production SLAs.
BEGIN;

CREATE FUNCTION couple_private.lr026_baseline_rank(
 p_session uuid,p_couple uuid,p_category text,p_card_id integer
) RETURNS integer LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $lr026_baseline$
 WITH candidate AS (
  SELECT coalesce(active.title,base.title) AS title,
         coalesce(active.description,base.description) AS description
  FROM (SELECT 1) seed
  LEFT JOIN couple_private.love_active_challenges active
    ON active.couple_id=p_couple
   AND active.category=p_category AND active.card_id=p_card_id
  LEFT JOIN public.love_base_challenges base
    ON base.category=p_category AND base.card_id=p_card_id
 )
 SELECT CASE WHEN EXISTS (
   SELECT 1 FROM public.couple_challenges seen CROSS JOIN candidate current_card
   WHERE seen.couple_id=p_couple AND seen.session_id=p_session
     AND seen.category=p_category
     AND (
       seen.card_id=p_card_id
       OR couple_private.love_variety_near(
         current_card.title,current_card.description,
         seen.card_title,seen.card_description)
     )
 ) THEN 1 ELSE 0 END;
$lr026_baseline$;

INSERT INTO public.love_base_challenges(category,card_id,title,description)
SELECT 'SENSUEL',g,'Performance '||g,'Activité originale numéro '||g
FROM pg_catalog.generate_series(10,209) AS g
ON CONFLICT DO NOTHING;

INSERT INTO public.couple_challenges(
 couple_id,session_id,category,card_id,card_title,card_description)
SELECT 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
       '33333333-3333-4333-8333-333333333333'::uuid,
       'SENSUEL',g,'Performance '||g,'Activité originale numéro '||g
FROM pg_catalog.generate_series(10,208) AS g;

DO $lr026_performance$
DECLARE
  a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  tonight uuid := '33333333-3333-4333-8333-333333333333';
  g integer;
  baseline_ranks integer[];
  modern_ranks integer[];
  start_at timestamptz;
  old_ms numeric;
  new_ms numeric;
BEGIN
  -- Warm both variants and validate the genuinely unseen 200th card.
  IF couple_private.lr026_baseline_rank(tonight,a,'SENSUEL',209)<>0
     OR couple_private.love_variety_rank(tonight,a,'SENSUEL',209)<>0 THEN
     RAISE EXCEPTION 'LR-026 profile: last unseen card lost its novelty';
  END IF;

  baseline_ranks := ARRAY[]::integer[];
  start_at := pg_catalog.clock_timestamp();
  FOR g IN 10..209 LOOP
    baseline_ranks := pg_catalog.array_append(
       baseline_ranks,
       couple_private.lr026_baseline_rank(tonight,a,'SENSUEL',g));
  END LOOP;
  old_ms := pg_catalog.extract(epoch FROM pg_catalog.clock_timestamp()-start_at)*1000;

  modern_ranks := ARRAY[]::integer[];
  start_at := pg_catalog.clock_timestamp();
  FOR g IN 10..209 LOOP
    modern_ranks := pg_catalog.array_append(
       modern_ranks,
       couple_private.love_variety_rank(tonight,a,'SENSUEL',g));
  END LOOP;
  new_ms := pg_catalog.extract(epoch FROM pg_catalog.clock_timestamp()-start_at)*1000;

  IF baseline_ranks IS DISTINCT FROM modern_ranks THEN
     RAISE EXCEPTION 'LR-026: fast path changed card ranking semantics';
  END IF;
  IF pg_catalog.array_length(modern_ranks,1)<>200
     OR modern_ranks[200]<>0
     OR EXISTS (SELECT 1 FROM pg_catalog.unnest(modern_ranks[1:199]) AS r
                 WHERE r<>1) THEN
     RAISE EXCEPTION 'LR-026: 199 seen cards / one unseen card disagreed';
  END IF;

  RAISE NOTICE 'LR-026 profile: 200 cards, 199 seen; baseline=% ms, exact-first=% ms (runner diagnostic only)',
    pg_catalog.round(old_ms,2),pg_catalog.round(new_ms,2);
END; $lr026_performance$;

ROLLBACK;
