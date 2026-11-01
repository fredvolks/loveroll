-- LR-026: representative performance/parity profile for *eligible* D100 cards.
-- Disposable PostgreSQL 17 ONLY. Real draw/repige SQL first EXCLUDES cards
-- previously drawn in this session/category/recipient, so the 199-seen
-- all-candidates microbenchmark is NOT representative of user latency.
-- Measure the unplayed set only, against identical already-played history. The reference rank now invokes
-- the frozen pre-optimization comparator, NOT the new comparator.
-- Timings are diagnostic; CI asserts parity and eligibility, not wall time.
BEGIN;

-- Frozen PRE-OPTIMIZATION semantic comparator; same original logic as
-- lr026-similarity-parity.test.sql. Compare actual old vs new CPU cost.
CREATE FUNCTION couple_private.lr026_previous_near(
 p_title text,p_description text,p_old_title text,p_old_description text
) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=''
AS $lr026_previous$
 WITH normalized AS (
   SELECT couple_private.love_variety_normalize(p_title) AS a_title,
          couple_private.love_variety_normalize(p_old_title) AS b_title,
          couple_private.love_variety_normalize(p_description) AS a_desc,
          couple_private.love_variety_normalize(p_old_description) AS b_desc
 ), current_terms AS (
   SELECT DISTINCT w.token
   FROM normalized n,
    LATERAL pg_catalog.regexp_split_to_table(n.a_desc,' ') AS w(token)
   WHERE pg_catalog.length(w.token)>=4 AND w.token NOT IN (
    'avec','comme','dans','pour','puis','sans','toute','tous','votre',
    'notre','leurs','chez','avant','apres','pendant','entre','faire',
    'faites','invite','invitez','propose','proposez','choisis',
    'choisissez','partenaire','ensemble','quelques','minutes','minute',
    'chaque','autre','vous','nous'
   )
 ), prior_terms AS (
   SELECT DISTINCT w.token
   FROM normalized n,
    LATERAL pg_catalog.regexp_split_to_table(n.b_desc,' ') AS w(token)
   WHERE pg_catalog.length(w.token)>=4 AND w.token NOT IN (
    'avec','comme','dans','pour','puis','sans','toute','tous','votre',
    'notre','leurs','chez','avant','apres','pendant','entre','faire',
    'faites','invite','invitez','propose','proposez','choisis',
    'choisissez','partenaire','ensemble','quelques','minutes','minute',
    'chaque','autre','vous','nous'
   )
 ), scores AS (
   SELECT
    (SELECT pg_catalog.count(*) FROM current_terms JOIN prior_terms USING(token)) AS shared,
    (SELECT pg_catalog.count(*) FROM current_terms) AS size_a,
    (SELECT pg_catalog.count(*) FROM prior_terms) AS size_b
 )
 SELECT (a_title<>'' AND b_title<>'' AND a_title=b_title)
   OR (shared>=5 AND shared*100 >= 68*(size_a+size_b-shared))
 FROM normalized CROSS JOIN scores;
$lr026_previous$;

CREATE FUNCTION couple_private.lr026_eligible_reference_rank(
 p_session uuid,p_couple uuid,p_category text,p_card_id integer
) RETURNS integer LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $lr026_reference$
 WITH candidate AS (
  SELECT coalesce(active.title,base.title) AS title,
         coalesce(active.description,base.description) AS description
  FROM (SELECT 1) seed
  LEFT JOIN couple_private.love_active_challenges active
    ON active.couple_id=p_couple AND active.category=p_category
   AND active.card_id=p_card_id
  LEFT JOIN public.love_base_challenges base
    ON base.category=p_category AND base.card_id=p_card_id
 )
 SELECT CASE WHEN EXISTS (
   SELECT 1 FROM public.couple_challenges seen
   CROSS JOIN candidate current_card
   WHERE seen.couple_id=p_couple AND seen.session_id=p_session
     AND seen.category=p_category
     AND (seen.card_id=p_card_id OR
       couple_private.lr026_previous_near(
        current_card.title,current_card.description,
        seen.card_title,seen.card_description))
 ) THEN 1 ELSE 0 END;
$lr026_reference$;

-- Exactly one category (100 cards), as in an actual D100 candidate pool.
-- Use only fabricated cards, history and couple UUID. No fixture mutations
-- survive ROLLBACK and no real user data is accessed.
INSERT INTO public.love_base_challenges(category,card_id,title,description)
SELECT 'SENSUEL',g,
       CASE WHEN g=99 THEN 'Une activité à deux mémorable'
            ELSE 'Scenario distinct '||g END,
       'Etape numero '||g
FROM pg_catalog.generate_series(3,100) g
ON CONFLICT DO NOTHING;

DO $lr026_eligible_profile$
DECLARE
 v_couple uuid:='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
 v_session uuid:='77777777-7777-4777-8777-777777777777';
 n_seen integer;
 older integer[];
 newer integer[];
 old_ms numeric;
 new_ms numeric;
 started timestamptz;
 total integer;
 expected_eligible integer;
BEGIN
 FOREACH n_seen IN ARRAY ARRAY[0,20,50,80] LOOP
  DELETE FROM public.couple_challenges h
  WHERE h.couple_id=v_couple AND h.session_id=v_session;

  -- A real eligible pool excludes all drawn IDs BEFORE ranking.
  INSERT INTO public.couple_challenges(
    couple_id,session_id,category,card_id,card_title,card_description)
  SELECT v_couple,v_session,'SENSUEL',g,
         CASE WHEN g=1 THEN 'Une activité à deux mémorable'
              ELSE 'Scenario distinct '||g END,
         'Etape numero '||g
  FROM pg_catalog.generate_series(1,n_seen) g;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.generate_series(n_seen+1,100) eligible(card)
    JOIN public.couple_challenges h
      ON h.couple_id=v_couple AND h.session_id=v_session
     AND h.category='SENSUEL' AND h.card_id=eligible.card
  ) THEN
    RAISE EXCEPTION 'LR-026 eligible profile incorrectly included played card';
  END IF;

  expected_eligible:=100-n_seen;
  started:=pg_catalog.clock_timestamp();
  SELECT pg_catalog.array_agg(
     couple_private.lr026_eligible_reference_rank(
       v_session,v_couple,'SENSUEL',eligible.card)
     ORDER BY eligible.card)
  INTO older
  FROM pg_catalog.generate_series(n_seen+1,100) eligible(card);
  old_ms:=EXTRACT(EPOCH FROM(pg_catalog.clock_timestamp()-started))*1000;

  started:=pg_catalog.clock_timestamp();
  SELECT pg_catalog.array_agg(
     couple_private.love_variety_rank(
       v_session,v_couple,'SENSUEL',eligible.card)
     ORDER BY eligible.card)
  INTO newer
  FROM pg_catalog.generate_series(n_seen+1,100) eligible(card);
  new_ms:=EXTRACT(EPOCH FROM(pg_catalog.clock_timestamp()-started))*1000;

  IF older IS DISTINCT FROM newer
     OR pg_catalog.array_length(newer,1) IS DISTINCT FROM expected_eligible
  THEN
    RAISE EXCEPTION 'LR-026 eligible history %: old/new rankings diverged',
      n_seen;
  END IF;

  -- Even with a different ID, an equivalent title should be downgraded.
  -- Candidate 99 exists in all four *eligible* sets, never in history.
  IF n_seen>0 THEN
    IF newer[99-n_seen] IS DISTINCT FROM 1 THEN
      RAISE EXCEPTION 'LR-026 eligible history %: semantic twin not penalized',
        n_seen;
    END IF;
    SELECT pg_catalog.count(*) INTO total
      FROM pg_catalog.unnest(newer) r WHERE r=1;
    IF total<>1 THEN
      RAISE EXCEPTION 'LR-026 eligible history %: unrelated cards penalized (%)',
        n_seen,total;
    END IF;
  ELSE
    SELECT pg_catalog.count(*) INTO total
      FROM pg_catalog.unnest(newer) r WHERE r=1;
    IF total<>0 THEN
      RAISE EXCEPTION 'LR-026 eligible history 0: unexpected penalization';
    END IF;
  END IF;

  RAISE NOTICE
    'LR-026 eligible category: % played, % eligible, old=% ms, new=% ms (CI diagnostic; not production SLA)',
    n_seen,expected_eligible,
    pg_catalog.round(old_ms,2),pg_catalog.round(new_ms,2);
 END LOOP;
END; $lr026_eligible_profile$;

-- Additional worst-case profile: longer synthetic descriptions with distinct
-- vocabulary per card. Unlike the short-text fixture, these 50 eligible
-- candidates must be compared with genuinely long 50-card history.
-- Run the optimized rank FIRST here to counter single-run cache-order bias;
-- older reference rank second. Both result arrays must stay identical.
DO $lr026_long_description_profile$
DECLARE
  v_couple uuid := 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  v_session uuid := '77777777-7777-4777-8777-777777777777';
  old_result integer[];
  new_result integer[];
  old_ms numeric;
  new_ms numeric;
  started timestamptz;
BEGIN
  DELETE FROM public.couple_challenges h
  WHERE h.couple_id=v_couple AND h.session_id=v_session;

  UPDATE public.love_base_challenges b
  SET description =
    'Imaginez une aventure tendre et proposez une surprise originale '
    || pg_catalog.substring(pg_catalog.md5(b.card_id::text),1,5)||' '
    || pg_catalog.substring(pg_catalog.md5(b.card_id::text),6,5)||' '
    || pg_catalog.substring(pg_catalog.md5(b.card_id::text),11,5)||' '
    || pg_catalog.substring(pg_catalog.md5(b.card_id::text),16,5)||' '
    || pg_catalog.substring(pg_catalog.md5(b.card_id::text),21,5)||' '
    || pg_catalog.substring(pg_catalog.md5(b.card_id::text),26,5)
  WHERE b.category='SENSUEL' AND b.card_id BETWEEN 1 AND 100;

  INSERT INTO public.couple_challenges(
    couple_id,session_id,category,card_id,card_title,card_description)
  SELECT v_couple,v_session,'SENSUEL',g,
         CASE WHEN g=1 THEN 'Une activité à deux mémorable'
              ELSE 'Scenario distinct '||g END,
         b.description
  FROM pg_catalog.generate_series(1,50) g
  LEFT JOIN public.love_base_challenges b
     ON b.category='SENSUEL' AND b.card_id=g;

  started:=pg_catalog.clock_timestamp();
  SELECT pg_catalog.array_agg(
    couple_private.love_variety_rank(
      v_session,v_couple,'SENSUEL',eligible.card)
    ORDER BY eligible.card)
  INTO new_result
  FROM pg_catalog.generate_series(51,100) eligible(card);
  new_ms:=EXTRACT(EPOCH FROM (
     pg_catalog.clock_timestamp()-started))*1000;

  started:=pg_catalog.clock_timestamp();
  SELECT pg_catalog.array_agg(
    couple_private.lr026_eligible_reference_rank(
      v_session,v_couple,'SENSUEL',eligible.card)
    ORDER BY eligible.card)
  INTO old_result
  FROM pg_catalog.generate_series(51,100) eligible(card);
  old_ms:=EXTRACT(EPOCH FROM (
     pg_catalog.clock_timestamp()-started))*1000;

  IF old_result IS DISTINCT FROM new_result
     OR pg_catalog.array_length(new_result,1)<>50 THEN
    RAISE EXCEPTION
     'LR-026 long description eligible ranking disagrees with original';
  END IF;
  IF new_result[49] IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION
     'LR-026 long descriptions lost title-equivalent candidate 99';
  END IF;
  RAISE NOTICE
    'LR-026 long descriptions (new FIRST): 50 seen, 50 eligible, old=% ms, new=% ms; CI runner diagnostic only',
    pg_catalog.round(old_ms,2),pg_catalog.round(new_ms,2);
END; $lr026_long_description_profile$;

ROLLBACK;
