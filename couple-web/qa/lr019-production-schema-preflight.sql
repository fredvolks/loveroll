-- LR-019 — READ-ONLY preflight for a designated LoveRoll staging copy.
-- DO NOT execute the three LR-019 replacing migrations unless every row
-- below is reviewed. This file never executes DDL or modifies customer data.
-- Snapshots represent the verified original production interfaces as of
-- 2026-10-28. A new legitimate migration may change an MD5; investigate,
-- do not overwrite the live function with an older implementation.
--
-- In the Supabase SQL editor: select this full statement on a staging copy.
-- The status column must be 'unchanged' for all 4 legacy functions.
WITH expected(signature, recorded_md5) AS (
 VALUES
  ('public.love_respond_and_redraw(uuid,text,boolean)','d3b15210682919a56242ba996994f6b2'),
  ('public.draw_for_partner(uuid,text,boolean)','b85aab4563ec7e04956bd059d91479fa'),
  ('public.love_cycle_status(uuid)','b802b1a75e6761a4cce34438c4004666'),
  ('public.finish_couple_session(uuid,boolean)','79f2a4846b57cce2e10cd37dc3495bc0')
), found AS (
 SELECT e.signature,e.recorded_md5,p.oid,p.prosecdef,p.proconfig,
  md5(pg_get_functiondef(p.oid)) AS detected_md5
 FROM expected e
 LEFT JOIN pg_proc p ON p.oid=to_regprocedure(e.signature)
)
SELECT signature,recorded_md5,detected_md5,
 CASE WHEN oid IS NULL THEN 'missing'
      WHEN recorded_md5<>detected_md5 THEN 'changed: REVIEW BEFORE REPLACING'
      WHEN prosecdef IS NOT TRUE THEN 'not-security-definer: REVIEW'
      WHEN NOT ('search_path='=ANY(coalesce(proconfig,ARRAY[]::text[])))
       THEN 'search_path changed: REVIEW'
      ELSE 'unchanged' END AS status
FROM found ORDER BY signature;

-- A second result checks other objects the D100/favorites migrations
-- require and confirms the new registry/capability are not half-installed.
SELECT
 to_regclass('public.couples') IS NOT NULL AS couples_present,
 to_regclass('public.couple_challenges') IS NOT NULL AS challenges_present,
 to_regclass('public.love_base_challenges') IS NOT NULL AS base_cards_present,
 to_regclass('public.love_custom_challenges') IS NOT NULL AS custom_cards_present,
 to_regclass('public.love_cycle_excluded_cards') IS NOT NULL AS exclusion_registry_present,
 to_regclass('public.love_couple_favorites') IS NOT NULL AS favorites_already_present,
 to_regprocedure('public.love_favorites_capabilities(uuid)') IS NOT NULL AS favorite_engine_already_active,
 current_database() AS checked_database;

-- NOTE: staging and production may diverge legitimately. This diagnostic
-- intentionally cannot approve a migration automatically. It makes a drift
-- visible before anyone touches a real couple's existing D100 mechanics.
