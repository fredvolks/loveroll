-- LR-026 — Intégration serveur préparatoire, NE PAS appliquer en production
-- Source : fonctions RPC réellement lues sur le projet LoveRoll le 29 oct. 2026.
-- Installation uniquement après revue SQL et tests sur une base isolée.
-- Conservé : contrôle de membre/identité, verrouillage, droits, rôles,
-- exclusions, cycle 200, favoris, catégorie/pondération D100, quotas et hasard.
-- Aucun droit d'exécution ajouté au client ; aucune nouvelle RPC publique.
-- Les candidats restent strictement ceux de la requête serveur autorisée.
-- Si tous les candidats sont semblables, le hasard reste opérationnel.
BEGIN;

DO $lr026_guard$
DECLARE v_draw text; v_redraw text;
BEGIN
  v_draw := pg_catalog.pg_get_functiondef(
    'public.draw_for_partner(uuid,text,boolean)'::pg_catalog.regprocedure);
  v_redraw := pg_catalog.pg_get_functiondef(
    'public.love_respond_and_redraw(uuid,text,boolean)'::pg_catalog.regprocedure);
  IF pg_catalog.md5(v_draw) <> 'b85aab4563ec7e04956bd059d91479fa'
     OR pg_catalog.md5(v_redraw) <> 'd3b15210682919a56242ba996994f6b2'
  THEN
    RAISE EXCEPTION 'LR-026 bloqué : les fonctions de pige ont changé, nouvelle revue obligatoire';
  END IF;
END; $lr026_guard$;

-- Pas de dépendance à unaccent/pg_trgm, absentes du projet vérifié.
CREATE OR REPLACE FUNCTION couple_private.love_variety_normalize(p_text text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path=''
AS $lr026$
  SELECT pg_catalog.btrim(pg_catalog.regexp_replace(
    pg_catalog.translate(pg_catalog.lower(coalesce(p_text,'')),
      'àáâäãåçèéêëìíîïñòóôöõùúûüýÿ',
      'aaaaaaceeeeiiiinooooouuuuyy'),
    '[^a-z0-9]+',' ','g'));
$lr026$;

CREATE OR REPLACE FUNCTION couple_private.love_variety_near(
 p_title text, p_description text, p_old_title text, p_old_description text
) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=''
AS $lr026$
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
$lr026$;

-- 0=nouveau, 1=semblable. Trie seulement les cartes DÉJÀ ADMISSIBLES.
-- Recherche uniquement dans la soirée courante de ce couple.
CREATE OR REPLACE FUNCTION couple_private.love_variety_rank(
 p_session uuid, p_couple uuid, p_category text, p_card_id integer
) RETURNS integer LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $lr026$
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
     -- Never let a card from another D100 category affect this draw.
     AND seen.category=p_category
     AND (
       seen.card_id=p_card_id
       OR couple_private.love_variety_near(
         current_card.title,current_card.description,
         seen.card_title,seen.card_description)
     )
 ) THEN 1 ELSE 0 END;
$lr026$;

REVOKE ALL ON FUNCTION couple_private.love_variety_normalize(text)
  FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION couple_private.love_variety_near(text,text,text,text)
  FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION couple_private.love_variety_rank(uuid,uuid,text,integer)
  FROM PUBLIC,anon,authenticated;

-- Patch chirurgical des DEUX RPC existantes. On échoue si un seul caractère
-- du contexte ciblé a changé ; pas de réécriture à l'aveugle des fonctions.
DO $lr026_apply$
DECLARE
 v_original text; v_replacement text; v_revised text;
 v_original_redraw text; v_replacement_redraw text;
BEGIN
 v_original := ' order by random() limit 1;' || chr(10) ||
               ' if cid is null then raise exception ''Aucune carte disponible'';end if;';
 v_replacement := ' order by couple_private.love_variety_rank(' ||
   'p_session,s.couple_id,v_cat,card) ASC, random() limit 1;' || chr(10) ||
   ' if cid is null then raise exception ''Aucune carte disponible'';end if;';
 v_revised := pg_catalog.pg_get_functiondef(
    'public.draw_for_partner(uuid,text,boolean)'::pg_catalog.regprocedure);
 IF (pg_catalog.length(v_revised) -
     pg_catalog.length(pg_catalog.replace(v_revised,v_original,'')))
      <> pg_catalog.length(v_original) THEN
   RAISE EXCEPTION 'LR-026 : point de branchement pige normale absent ou ambigu';
 END IF;
 EXECUTE pg_catalog.replace(v_revised,v_original,v_replacement);

 v_original_redraw := ' ORDER BY random() LIMIT 1;' || chr(10) || chr(10) ||
                      ' -- An exhausted lot cannot consume a pass';
 v_replacement_redraw := ' ORDER BY couple_private.love_variety_rank(' ||
  'v_old.session_id,v_couple,v_old.category,candidate.card)' ||
  ' ASC, random() LIMIT 1;' || chr(10) || chr(10) ||
  ' -- An exhausted lot cannot consume a pass';
 v_revised := pg_catalog.pg_get_functiondef(
    'public.love_respond_and_redraw(uuid,text,boolean)'::pg_catalog.regprocedure);
 IF (pg_catalog.length(v_revised) -
     pg_catalog.length(pg_catalog.replace(v_revised,v_original_redraw,'')))
      <> pg_catalog.length(v_original_redraw) THEN
   RAISE EXCEPTION 'LR-026 : point de branchement Passer/Refuser absent ou ambigu';
 END IF;
 EXECUTE pg_catalog.replace(v_revised,v_original_redraw,v_replacement_redraw);

 -- Les fonctions publiques héritent de leurs droits EXACTS : ni GRANT ni
 -- changement d'argument, de RLS, d'attribution, d'historique ou de hasard.
END; $lr026_apply$;

-- Vérification post-installation, avant COMMIT : rollback complet sinon.
-- La sélection de catégorie, les droits et les exclusions sont préservés
-- par la vérification initiale du code source exact et les deux substitutions.
DO $lr026_postcheck$
DECLARE v_normal text; v_replace text;
BEGIN
 v_normal := pg_catalog.pg_get_functiondef(
  'public.draw_for_partner(uuid,text,boolean)'::pg_catalog.regprocedure);
 v_replace := pg_catalog.pg_get_functiondef(
  'public.love_respond_and_redraw(uuid,text,boolean)'::pg_catalog.regprocedure);
 IF pg_catalog.strpos(v_normal,
    'order by couple_private.love_variety_rank(p_session,s.couple_id,v_cat,card)')
    = 0 OR
    pg_catalog.strpos(v_replace,
    'ORDER BY couple_private.love_variety_rank(v_old.session_id,v_couple,v_old.category,candidate.card)')
    = 0 THEN
   RAISE EXCEPTION 'LR-026 : intégration RPC incomplète, rollback';
 END IF;
 IF (SELECT pg_catalog.count(*) FROM pg_catalog.pg_proc p
     JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='couple_private'
     AND p.proname IN ('love_variety_normalize','love_variety_near','love_variety_rank')) <> 3
 THEN
   RAISE EXCEPTION 'LR-026 : fonctions privées manquantes, rollback';
 END IF;
END; $lr026_postcheck$;

COMMIT;
