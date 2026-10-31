-- LR-026: staging readiness / RLS preflight. STRICTLY READ-ONLY.
-- Inspect pg_catalog only. No customer rows, DDL, RPC calls or secrets.
-- Run AFTER applying the guarded LR-026 migration to an ISOLATED staging DB.
-- Final output: PASS|0 or FAIL|<number>|<failed check identifiers>.
-- The companion CI recipe tests this on a disposable PostgreSQL database.
WITH expected_tables(t) AS (
 VALUES ('couple_sessions'),('couple_members'),
        ('couple_personal_rolls'),('couple_challenges')
),
permissive_policies(t, policy, rule) AS (
 VALUES
 ('couple_sessions','sessions_read','couple_private.is_member'),
 ('couple_members','members_read','couple_private.is_member'),
 ('couple_personal_rolls','personal_rolls_read','couple_private.is_member'),
 ('couple_challenges','challenges_read','couple_private.is_member')
),
expected_rpcs(name) AS (
 VALUES ('draw_for_partner'),('love_respond_and_redraw')
),
checks AS (
 -- Every web-exposed game table must enforce RLS.
 SELECT 'RLS_ENABLED:'||t AS check_id,
   EXISTS(
     SELECT 1 FROM pg_catalog.pg_class c
     JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relname=t AND c.relkind='r'
       AND c.relrowsecurity
   ) AS ok
 FROM expected_tables
 UNION ALL
 -- Signed-in players need SELECT, anonymous users must not get SELECT.
 SELECT 'ROLE_GRANTS:'||t,
   EXISTS(
     SELECT 1 FROM pg_catalog.pg_class c
     JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relname=t
       AND pg_catalog.has_table_privilege('authenticated',c.oid,'SELECT')
       AND NOT pg_catalog.has_table_privilege('anon',c.oid,'SELECT')
   )
 FROM expected_tables
 UNION ALL
 -- Verified email is an AND gate, not a permissive OR bypass.
 SELECT 'VERIFIED_IDENTITY_RESTRICTIVE:'||t,
   EXISTS(
     SELECT 1 FROM pg_catalog.pg_policies p
     WHERE p.schemaname='public' AND p.tablename=t
       AND p.policyname='loveroll_confirmed_email_required'
       AND p.permissive='RESTRICTIVE' AND p.cmd='ALL'
       AND 'authenticated'=ANY(p.roles)
       AND position('love_verified_identity' in lower(coalesce(p.qual,'')))>0
   )
 FROM expected_tables
 UNION ALL
 -- Every SELECT must have a genuine, membership-scoped allow policy.
 -- Challenges are additionally scoped to the recipient (not just duo).
 SELECT 'MEMBER_SCOPED_READ:'||e.t,
   EXISTS(
     SELECT 1 FROM pg_catalog.pg_policies p
     WHERE p.schemaname='public' AND p.tablename=e.t
       AND p.policyname=e.policy AND p.permissive='PERMISSIVE'
       AND p.cmd='SELECT' AND 'authenticated'=ANY(p.roles)
       AND position(e.rule in lower(coalesce(p.qual,'')))>0
       AND (e.t<>'couple_challenges' OR
          (position('recipient' in lower(coalesce(p.qual,'')))>0
           AND position('auth.uid' in lower(coalesce(p.qual,'')))>0))
   )
 FROM permissive_policies e
 UNION ALL
 -- An extra permissive SELECT/ALL policy could bypass membership:
 -- PostgreSQL OR-combines permissive grants, regardless of named safe policy.
 SELECT 'NO_EXTRA_PERMISSIVE_READ:'||e.t,
   NOT EXISTS(
     SELECT 1 FROM pg_catalog.pg_policies p
     WHERE p.schemaname='public' AND p.tablename=e.t
       AND p.permissive='PERMISSIVE'
       AND p.cmd IN ('SELECT','ALL')
       AND (('authenticated'=ANY(p.roles)) OR ('public'=ANY(p.roles)))
       AND p.policyname<>e.policy
   )
 FROM permissive_policies e
 UNION ALL
 -- RPC must remain SECURITY DEFINER, reachable only by authenticated.
 SELECT 'RPC_PRIVILEGES:'||e.name,
   EXISTS(
     SELECT 1 FROM pg_catalog.pg_proc p
     JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname=e.name
       AND p.pronargs=3 AND p.prosecdef
       AND pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
       AND NOT pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
       AND EXISTS(
         SELECT 1 FROM pg_catalog.unnest(p.proconfig) cfg
         WHERE cfg LIKE 'search_path=%')
   )
 FROM expected_rpcs e
 UNION ALL
 -- This recipe is meant for staging AFTER LR-026 was actually applied.
 SELECT 'VARIETY_PATCH_INSTALLED:'||e.name,
   EXISTS(
     SELECT 1 FROM pg_catalog.pg_proc p
     JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname=e.name
       AND p.pronargs=3
       AND position('couple_private.love_variety_rank(' in
         pg_catalog.pg_get_functiondef(p.oid))>0
   )
 FROM expected_rpcs e
)
SELECT CASE WHEN count(*) FILTER(WHERE NOT ok)=0 THEN 'PASS' ELSE 'FAIL' END
  || '|' || count(*) FILTER(WHERE NOT ok)
  || '|' || coalesce(string_agg(check_id,',' ORDER BY check_id)
      FILTER(WHERE NOT ok),'') AS lr026_staging_readiness
FROM checks;
