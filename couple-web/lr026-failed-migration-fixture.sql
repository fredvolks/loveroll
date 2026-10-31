-- Disposable PostgreSQL CI ONLY: deliberately drift a single comment in the
-- replacement RPC, while keeping the original D100 RPC patch anchor intact.
-- The fixture fingerprints must be recomputed AFTER this intentional drift.
DO $lr026_broken_anchor$
DECLARE
  v_sql text;
  v_expected text := ' -- An exhausted lot cannot consume a pass';
BEGIN
  v_sql := pg_catalog.pg_get_functiondef(
    'public.love_respond_and_redraw(uuid,text,boolean)'::pg_catalog.regprocedure);
  IF (pg_catalog.length(v_sql) -
      pg_catalog.length(pg_catalog.replace(v_sql,v_expected,'')))
     <> pg_catalog.length(v_expected) THEN
    RAISE EXCEPTION 'LR-026 negative fixture: expected exactly one redraw anchor';
  END IF;
  EXECUTE pg_catalog.replace(
    v_sql,v_expected,
    ' -- Intentionally changed for LR-026 atomic rollback test');
END; $lr026_broken_anchor$;
