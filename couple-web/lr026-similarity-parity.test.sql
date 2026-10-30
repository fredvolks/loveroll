-- LR-026 comparator parity (disposable PostgreSQL only).
-- Preserve the ORIGINAL semantic comparator independently of optimized code.
-- Compare fixed edge cases and hundreds of synthetic combinations.
-- Any changed result fails CI; no real cards or user data are involved.
BEGIN;
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

CREATE TEMP TABLE lr026_similarity_cases(
 id integer GENERATED ALWAYS AS IDENTITY,
 title_a text,
 desc_a text,
 title_b text,
 desc_b text,
 expected boolean
) ON COMMIT DROP;
INSERT INTO lr026_similarity_cases(
 title_a,desc_a,title_b,desc_b,expected)
VALUES
 ('Un câlin','court','Un calin','court',false),
 ('Une danse','très court','Une danse','sans importance',true),
 ('Cœur & douceur','', 'Coeur douceur',NULL,true),
 (NULL,NULL,NULL,NULL,false),
 ('Danse','un deux trois','Cuisine','quatre cinq six',false),
 ('Différent','alpha bravo charlie delta echo',
  'Distinct','alpha bravo charlie delta echo',true),
 ('Différent','alpha bravo charlie delta echo foxtrot',
  'Distinct','alpha bravo charlie delta echo foxtrot',true),
 ('Différent','alpha bravo charlie delta echo foxtrot golf hotel india juliet',
  'Distinct','alpha bravo charlie delta echo autre chose supplement',false),
 ('Différent','alpha alpha alpha alpha alpha',
  'Distinct','alpha alpha alpha alpha alpha',false),
 ('Différent','avec comme dans pour puis sans toute tous',
  'Distinct','avec comme dans pour puis sans toute tous',false),
 ('Différent','abc abcd abcde','Distinct','abc abcd abcde',false),
 ('Différent','étoile lumière rivière sourire musique',
  'Distinct','etoile lumiere riviere sourire musique',true),
 ('Différent','aaaa bbbb cccc dddd eeee',
  'Distinct','aaaa bbbb cccc dddd eeee',true),
 ('Différent','aaaa bbbb cccc dddd',
  'Distinct','aaaa bbbb cccc dddd',false),
 ('Différent','aaaa bbbb cccc dddd eeee',
  'Distinct','zzzz yyyy xxxx wwww vvvv',false);

-- 400 additional deterministic pairs: varied lengths, titles, punctuation,
-- accents, repeated tokens and shared descriptions with extra padding.
INSERT INTO lr026_similarity_cases(title_a,desc_a,title_b,desc_b)
SELECT
 CASE WHEN g%19=0 THEN 'Titre commun' ELSE 'Titre A '||g END,
 CASE
  WHEN g%7=0 THEN NULL
  WHEN g%7=1 THEN 'bonjour ici'
  WHEN g%7=2 THEN 'alpha bravo charlie delta echo'
  WHEN g%7=3 THEN 'alpha bravo charlie delta echo foxtrot'
  WHEN g%7=4 THEN 'avec comme dans pour faire ensemble'
  WHEN g%7=5 THEN 'abcdefghij abcdefghij abcdefghij abcdefghij'
  ELSE 'douceur émotion liberté tendresse musique passion éternité'
 END || CASE WHEN g%11=0 THEN ' numéro '||g ELSE '' END,
 CASE WHEN g%19=0 THEN 'Titre commun' ELSE 'Titre B '||g END,
 CASE
  WHEN g%13=0 THEN NULL
  WHEN g%13=1 THEN 'bonjour ici'
  WHEN g%13=2 THEN 'alpha bravo charlie delta echo'
  WHEN g%13=3 THEN 'alpha bravo charlie delta echo foxtrot'
  WHEN g%13=4 THEN 'avec comme dans pour faire ensemble'
  WHEN g%13=5 THEN 'abcdefghij abcdefghij abcdefghij abcdefghij'
  WHEN g%13=6 THEN 'douceur emotion liberte tendresse musique passion eternite'
  ELSE 'autre phrase couleur regard folie sourire'
 END || CASE WHEN g%17=0 THEN ' numéro '||g ELSE '' END
FROM pg_catalog.generate_series(1,400) g;

DO $lr026_similarity_check$
DECLARE bad record; actual integer; older boolean; newer boolean;
BEGIN
 SELECT count(*) INTO actual FROM lr026_similarity_cases;
 IF actual<>415 THEN
   RAISE EXCEPTION 'LR-026 parity fixture should contain 415 cases, got %',
     actual;
 END IF;
 FOR bad IN
   SELECT id,title_a,desc_a,title_b,desc_b,expected
   FROM lr026_similarity_cases
 LOOP
   older:=couple_private.lr026_previous_near(
     bad.title_a,bad.desc_a,bad.title_b,bad.desc_b);
   newer:=couple_private.love_variety_near(
     bad.title_a,bad.desc_a,bad.title_b,bad.desc_b);
   IF older IS DISTINCT FROM newer THEN
     RAISE EXCEPTION 'LR-026 comparator drift on case %: old %, new %',
       bad.id,older,newer;
   END IF;
   IF bad.expected IS NOT NULL AND newer IS DISTINCT FROM bad.expected THEN
     RAISE EXCEPTION 'LR-026 unexpected similarity on case %: expected %, got %',
       bad.id,bad.expected,newer;
   END IF;
 END LOOP;
 RAISE NOTICE 'LR-026 semantic parity: 415/415 original vs optimized decisions identical';
END; $lr026_similarity_check$;
ROLLBACK;
