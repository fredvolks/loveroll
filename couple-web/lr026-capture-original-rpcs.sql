-- CI-only disposable PostgreSQL fixture. Snapshot the two original RPC
-- definitions BEFORE applying LR-026. No production schema is touched.
CREATE TABLE public.lr026_ci_source_snapshots (
  rpc text PRIMARY KEY,
  original_source text NOT NULL,
  original_md5 text NOT NULL
);
INSERT INTO public.lr026_ci_source_snapshots(rpc,original_source,original_md5)
SELECT entry.rpc,entry.source,pg_catalog.md5(entry.source)
FROM (
  SELECT 'draw_for_partner'::text AS rpc,
    pg_catalog.pg_get_functiondef(
      'public.draw_for_partner(uuid,text,boolean)'::pg_catalog.regprocedure) AS source
  UNION ALL
  SELECT 'love_respond_and_redraw'::text,
    pg_catalog.pg_get_functiondef(
      'public.love_respond_and_redraw(uuid,text,boolean)'::pg_catalog.regprocedure)
) entry;
