-- LR-026 : AUDIT EN LECTURE SEULE du vrai schéma LoveRoll.
-- N'applique AUCUNE migration, ne lit AUCUNE carte utilisateur ni Auth.
-- Conçu pour être rejoué juste avant la préparation d'un déploiement,
-- et pour bloquer toute signature RPC / règle / structure inattendue.
-- Les échecs sont détaillés dans la colonne blockers, jamais ignorés.
-- to_regprocedure() renvoie NULL si une RPC a disparu : résultat bloqué,
-- jamais une exception qui masquerait le diagnostic.
WITH expected AS (
 SELECT
  'b85aab4563ec7e04956bd059d91479fa'::text AS normal_md5,
  'd3b15210682919a56242ba996994f6b2'::text AS redraw_md5
), rpc AS (
 SELECT p.proname,
        pg_catalog.pg_get_functiondef(p.oid) AS body,
        pg_catalog.md5(pg_catalog.pg_get_functiondef(p.oid)) AS hash,
        p.prosecdef,
        p.proconfig,
        p.oid
 FROM pg_catalog.pg_proc p
 JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND
       (p.oid=pg_catalog.to_regprocedure('public.draw_for_partner(uuid,text,boolean)')
        OR p.oid=pg_catalog.to_regprocedure('public.love_respond_and_redraw(uuid,text,boolean)'))
), checks AS (
 SELECT
  -- Re-run the EXACT original body guard in the proposed migration.
  ((SELECT hash FROM rpc WHERE proname='draw_for_partner')=e.normal_md5
   AND (SELECT hash FROM rpc WHERE proname='love_respond_and_redraw')=e.redraw_md5)
       AS signatures_unchanged,
  (SELECT pg_catalog.count(*)=2 FROM rpc) AS both_rpcs_present,
  (SELECT pg_catalog.bool_and(
      prosecdef AND
      EXISTS (SELECT 1 FROM pg_catalog.unnest(proconfig) AS opt(value)
       WHERE opt.value LIKE 'search_path=%'
       AND pg_catalog.btrim(pg_catalog.split_part(opt.value,'=',2),'"')='')
      AND NOT pg_catalog.has_function_privilege('anon',oid,'EXECUTE')
      AND pg_catalog.has_function_privilege('authenticated',oid,'EXECUTE')
     ) FROM rpc) AS rpc_permissions_preserved,
  (SELECT pg_catalog.strpos(body,
    'order by random() limit 1;')>0
   AND pg_catalog.strpos(body,
    'couple_private.love_role_allows')>0
   AND pg_catalog.strpos(body,
    'public.love_card_draw_history')>0
   AND pg_catalog.strpos(body,
    'public.love_cycle_excluded_cards')>0
   AND pg_catalog.strpos(body,
    'public.love_require_verified_identity')>0
   FROM rpc WHERE proname='draw_for_partner') AS normal_draw_rules_present,
  (SELECT pg_catalog.strpos(body,
    'ORDER BY random() LIMIT 1;')>0
   AND pg_catalog.strpos(body,
    'v_used>=v_limit')>0
   AND pg_catalog.strpos(body,
    'IF p_action=''refuse'' AND p_exclude IS TRUE THEN')>0
   AND pg_catalog.strpos(body,
    'v_prior.replacement_id')>0
   AND pg_catalog.strpos(body,
    'couple_private.love_role_allows')>0
   AND pg_catalog.strpos(body,
    'public.love_cycle_excluded_cards')>0
   FROM rpc WHERE proname='love_respond_and_redraw') AS redraw_rules_present,
  (SELECT pg_catalog.count(*)=3 FROM pg_catalog.pg_class c
   JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
   WHERE (n.nspname,c.relname,c.relkind) IN (
    ('public','couple_challenges','r'),
    ('public','love_base_challenges','r'),
    ('couple_private','love_active_challenges','v'))) AS active_view_and_tables_present,
  (SELECT pg_catalog.count(*)=10 FROM pg_catalog.pg_attribute a
   JOIN pg_catalog.pg_class c ON c.oid=a.attrelid
   JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
   WHERE a.attnum>0 AND NOT a.attisdropped AND
    (n.nspname,c.relname,a.attname) IN (
     ('public','couple_challenges','couple_id'),
     ('public','couple_challenges','session_id'),
     ('public','couple_challenges','category'),
     ('public','couple_challenges','card_id'),
     ('public','couple_challenges','card_title'),
     ('public','couple_challenges','card_description'),
     ('public','love_base_challenges','title'),
     ('public','love_base_challenges','description'),
     ('couple_private','love_active_challenges','title'),
     ('couple_private','love_active_challenges','description'))) AS required_columns_present,
  (SELECT pg_catalog.bool_and(c.relrowsecurity)
   FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname IN (
      'couple_challenges','love_base_challenges','couples',
      'love_card_draw_history','love_cycle_excluded_cards')
      AND c.relkind='r') AS exposed_tables_have_rls,
  (SELECT pg_catalog.count(*)=5 FROM pg_catalog.pg_class c
   JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname IN (
      'couple_challenges','love_base_challenges','couples',
      'love_card_draw_history','love_cycle_excluded_cards')
      AND c.relkind='r') AS all_rls_tables_present,
  -- RLS enabled alone is insufficient: permissive SELECT policies are
  -- OR-combined. Assert the actual LoveRoll member/recipient guards and
  -- fail closed if another browser-visible permissive read policy appears.
  (SELECT pg_catalog.count(*)=2
          AND pg_catalog.bool_and(
       (c.relname='couple_challenges' AND p.polname='challenges_read'
         AND p.polcmd='r'
         AND pg_catalog.strpos(pg_catalog.pg_get_expr(p.polqual,p.polrelid),
                               'recipient')>0
         AND pg_catalog.strpos(pg_catalog.pg_get_expr(p.polqual,p.polrelid),
                               'auth.uid()')>0
         AND pg_catalog.strpos(pg_catalog.pg_get_expr(p.polqual,p.polrelid),
                               'couple_private.is_member')>0)
       OR
       (c.relname='couples' AND p.polname='couples_read'
         AND p.polcmd='r'
         AND pg_catalog.strpos(pg_catalog.pg_get_expr(p.polqual,p.polrelid),
                               'couple_private.is_member')>0)
     )
   FROM pg_catalog.pg_policy p
   JOIN pg_catalog.pg_class c ON c.oid=p.polrelid
   JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname IN ('couple_challenges','couples')
     AND p.polpermissive AND p.polcmd IN ('r','*')
     AND (0::oid=ANY(p.polroles) OR EXISTS(
       SELECT 1 FROM pg_catalog.pg_roles r
       WHERE r.oid=ANY(p.polroles) AND r.rolname='authenticated'))
  ) AS browser_select_policies_scoped,
  (SELECT pg_catalog.count(*)=2 FROM pg_catalog.pg_policy p
   JOIN pg_catalog.pg_class c ON c.oid=p.polrelid
   JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname IN ('couple_challenges','couples')
     AND p.polname='loveroll_confirmed_email_required'
     AND NOT p.polpermissive AND p.polcmd='*'
     AND EXISTS (SELECT 1 FROM pg_catalog.pg_roles r
       WHERE r.oid=ANY(p.polroles) AND r.rolname='authenticated')
     AND pg_catalog.strpos(pg_catalog.pg_get_expr(p.polqual,p.polrelid),
                           'love_verified_identity')>0
     AND pg_catalog.strpos(pg_catalog.pg_get_expr(p.polwithcheck,p.polrelid),
                           'love_verified_identity')>0
  ) AS verified_identity_is_restrictive,
  (SELECT pg_catalog.count(*)=5
          AND pg_catalog.bool_and(
            NOT pg_catalog.has_table_privilege('anon',c.oid,'SELECT')
            AND NOT pg_catalog.has_table_privilege('anon',c.oid,'INSERT')
            AND NOT pg_catalog.has_table_privilege('anon',c.oid,'UPDATE')
            AND NOT pg_catalog.has_table_privilege('anon',c.oid,'DELETE')
            AND pg_catalog.has_table_privilege('authenticated',c.oid,'SELECT')
              = (c.relname IN ('couple_challenges','couples'))
            AND NOT pg_catalog.has_table_privilege('authenticated',c.oid,'INSERT')
            AND NOT pg_catalog.has_table_privilege('authenticated',c.oid,'UPDATE')
            AND NOT pg_catalog.has_table_privilege('authenticated',c.oid,'DELETE')
          )
   FROM pg_catalog.pg_class c
   JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind='r' AND c.relname IN (
      'couple_challenges','couples','love_base_challenges',
      'love_card_draw_history','love_cycle_excluded_cards')
  ) AS browser_table_permissions_safe,
  -- The real Passer/Refuser RPC updates only status. A production BEFORE
  -- UPDATE OF status trigger must set passed_at, otherwise the monthly quota
  -- query ignores every un-stamped pass. Fail closed on a missing/changed
  -- trigger OR on drift in its function (fingerprint verified on 2026-10-30).
  (SELECT pg_catalog.count(*)=1 AND pg_catalog.bool_and(
      t.tgenabled='O' AND NOT t.tgisinternal AND
      t.tgfoid=pg_catalog.to_regprocedure(
        'couple_private.love_stamp_challenge_pass()') AND
      pg_catalog.pg_get_triggerdef(t.oid)=
        'CREATE TRIGGER love_stamp_passed_at BEFORE UPDATE OF status ON public.couple_challenges FOR EACH ROW EXECUTE FUNCTION couple_private.love_stamp_challenge_pass()'
    )
   FROM pg_catalog.pg_trigger t
   JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
   JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname='couple_challenges'
     AND t.tgname='love_stamp_passed_at'
  ) AS pass_timestamp_trigger_intact,
  (SELECT pg_catalog.count(*)=1 AND pg_catalog.bool_and(
     NOT p.prosecdef AND
     pg_catalog.md5(pg_catalog.pg_get_functiondef(p.oid))=
       '3241da749bd0647c6106c613c7e3615a'
   ) FROM pg_catalog.pg_proc p
   JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='couple_private'
     AND p.proname='love_stamp_challenge_pass'
     AND p.prorettype='pg_catalog.trigger'::pg_catalog.regtype
  ) AS pass_timestamp_function_intact,
  (SELECT pg_catalog.count(*)=0 FROM pg_catalog.pg_proc p
   JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='couple_private'
     AND p.proname IN ('love_variety_normalize',
                     'love_variety_near','love_variety_rank'))
      AS pending_migration_not_already_installed
 FROM expected e
)
SELECT (pg_catalog.cardinality(blockers)=0) AS ready_for_isolated_staging_review,
       blockers
FROM checks c
CROSS JOIN LATERAL (
 SELECT pg_catalog.array_remove(ARRAY[
   CASE WHEN c.signatures_unchanged IS TRUE THEN NULL ELSE 'RPC source MD5 drifted' END,
   CASE WHEN c.both_rpcs_present IS TRUE THEN NULL ELSE 'One or both RPCs missing' END,
   CASE WHEN c.rpc_permissions_preserved IS TRUE THEN NULL ELSE 'RPC ACL / SECURITY DEFINER / search_path drifted' END,
   CASE WHEN c.normal_draw_rules_present IS TRUE THEN NULL ELSE 'Normal D100 eligibility rules changed' END,
   CASE WHEN c.redraw_rules_present IS TRUE THEN NULL ELSE 'Refusal/quota/repige rules changed' END,
   CASE WHEN c.active_view_and_tables_present IS TRUE THEN NULL ELSE 'Real active-card view or tables changed' END,
   CASE WHEN c.required_columns_present IS TRUE THEN NULL ELSE 'Live card/history columns changed' END,
   CASE WHEN c.exposed_tables_have_rls IS TRUE THEN NULL ELSE 'RLS disabled on game tables' END,
   CASE WHEN c.all_rls_tables_present IS TRUE THEN NULL ELSE 'Expected RLS tables missing' END,
   CASE WHEN c.browser_select_policies_scoped IS TRUE THEN NULL ELSE 'RLS SELECT policy scope widened' END,
   CASE WHEN c.verified_identity_is_restrictive IS TRUE THEN NULL ELSE 'Verified identity RLS policy no longer restrictive' END,
   CASE WHEN c.browser_table_permissions_safe IS TRUE THEN NULL ELSE 'Browser table GRANTs widened' END,
   CASE WHEN c.pass_timestamp_trigger_intact IS TRUE THEN NULL ELSE 'Pass timestamp trigger missing or disabled' END,
   CASE WHEN c.pass_timestamp_function_intact IS TRUE THEN NULL ELSE 'Pass timestamp function drifted' END,
   CASE WHEN c.pending_migration_not_already_installed IS TRUE THEN NULL ELSE 'LR-026 helpers already present' END
 ],NULL::text) AS blockers
) result;
