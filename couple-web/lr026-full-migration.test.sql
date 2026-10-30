-- Run only in the disposable GitHub Actions PostgreSQL fixture database.
-- Confirms that the FULL guarded migration successfully patched the two RPCs.
DO $lr026_full_test$
DECLARE official_sql text; replacement_sql text;
BEGIN
 official_sql := pg_catalog.pg_get_functiondef(
  'public.draw_for_partner(uuid,text,boolean)'::pg_catalog.regprocedure);
 replacement_sql := pg_catalog.pg_get_functiondef(
  'public.love_respond_and_redraw(uuid,text,boolean)'::pg_catalog.regprocedure);
 IF pg_catalog.strpos(official_sql,
    'order by couple_private.love_variety_rank(p_session,s.couple_id,v_cat,card)')=0
 THEN
  RAISE EXCEPTION 'LR-026: normal D100 draw did not receive ranking';
 END IF;
 IF pg_catalog.strpos(replacement_sql,
    'ORDER BY couple_private.love_variety_rank(v_old.session_id,v_couple,v_old.category,candidate.card)')=0
 THEN
  RAISE EXCEPTION 'LR-026: Passer/Refuser redraw did not receive ranking';
 END IF;
 IF pg_catalog.has_function_privilege('anon',
    'public.draw_for_partner(uuid,text,boolean)','EXECUTE')
  OR pg_catalog.has_function_privilege('anon',
    'public.love_respond_and_redraw(uuid,text,boolean)','EXECUTE')
 THEN
  RAISE EXCEPTION 'LR-026: anonymous call authorization was widened';
 END IF;
 IF NOT pg_catalog.has_function_privilege('authenticated',
    'public.draw_for_partner(uuid,text,boolean)','EXECUTE')
    OR NOT pg_catalog.has_function_privilege('authenticated',
    'public.love_respond_and_redraw(uuid,text,boolean)','EXECUTE')
 THEN
   RAISE EXCEPTION 'LR-026: existing authenticated RPC grants were removed';
 END IF;
 IF NOT EXISTS (
  SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n
   ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='draw_for_partner'
   AND p.prosecdef AND EXISTS (
      SELECT 1 FROM pg_catalog.unnest(p.proconfig) AS cfg(option)
      WHERE cfg.option LIKE 'search_path=%'
        AND pg_catalog.btrim(pg_catalog.split_part(cfg.option,'=',2),'"')=''
   )
 ) THEN
   RAISE EXCEPTION 'LR-026: draw security-definer / search_path changed';
 END IF;
 IF NOT EXISTS (
  SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n
   ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='love_respond_and_redraw'
   AND p.prosecdef AND EXISTS (
      SELECT 1 FROM pg_catalog.unnest(p.proconfig) AS cfg(option)
      WHERE cfg.option LIKE 'search_path=%'
        AND pg_catalog.btrim(pg_catalog.split_part(cfg.option,'=',2),'"')=''
   )
 ) THEN
   RAISE EXCEPTION 'LR-026: redraw security-definer / search_path changed';
 END IF;
END; $lr026_full_test$;
