-- Run ONLY after an expected FAILED whole migration in a disposable
-- PostgreSQL database; this SQL must remain read-only.
BEGIN READ ONLY;
DO $lr026_atomic_rollback$
DECLARE
  v_draw text;
  v_redraw text;
BEGIN
  v_draw := pg_catalog.pg_get_functiondef(
    'public.draw_for_partner(uuid,text,boolean)'::pg_catalog.regprocedure);
  v_redraw := pg_catalog.pg_get_functiondef(
    'public.love_respond_and_redraw(uuid,text,boolean)'::pg_catalog.regprocedure);

  IF pg_catalog.strpos(v_draw,'order by random() limit 1;') = 0
     OR pg_catalog.strpos(v_redraw,'ORDER BY random() LIMIT 1;') = 0 THEN
    RAISE EXCEPTION 'LR-026: rollback removed an original draw ordering';
  END IF;
  IF pg_catalog.strpos(v_draw,'couple_private.love_variety_rank(') > 0
     OR pg_catalog.strpos(v_redraw,'couple_private.love_variety_rank(') > 0 THEN
    RAISE EXCEPTION 'LR-026: partially patched RPC survived failed migration';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='couple_private'
      AND p.proname IN (
        'love_variety_normalize','love_variety_near','love_variety_rank')
  ) THEN
    RAISE EXCEPTION 'LR-026: private helpers survived failed migration';
  END IF;
  IF pg_catalog.has_function_privilege('anon',
       'public.draw_for_partner(uuid,text,boolean)','EXECUTE')
     OR pg_catalog.has_function_privilege('anon',
       'public.love_respond_and_redraw(uuid,text,boolean)','EXECUTE')
  THEN
    RAISE EXCEPTION 'LR-026: rollback widened anonymous RPC execution';
  END IF;
  IF NOT pg_catalog.has_function_privilege('authenticated',
        'public.draw_for_partner(uuid,text,boolean)','EXECUTE')
     OR NOT pg_catalog.has_function_privilege('authenticated',
        'public.love_respond_and_redraw(uuid,text,boolean)','EXECUTE') THEN
    RAISE EXCEPTION 'LR-026: rollback removed authenticated RPC privileges';
  END IF;
  IF (SELECT pg_catalog.count(*) FROM public.couple_challenges) <> 1
     OR (SELECT pg_catalog.count(*) FROM public.love_base_challenges) <> 4
     OR (SELECT pg_catalog.count(*) FROM couple_private.love_active_challenges) <> 1
  THEN
    RAISE EXCEPTION 'LR-026: failed migration modified synthetic game data';
  END IF;
END; $lr026_atomic_rollback$;
ROLLBACK;
