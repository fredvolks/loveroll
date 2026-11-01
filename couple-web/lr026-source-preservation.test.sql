-- CI-only source equivalence proof: undo JUST the newly injected ranking
-- expression in each SQL definition; the result must be byte-for-byte
-- identical to the exact pre-migration server definition saved by CI.
-- Stronger than checking named rules: catches ANY unrelated alteration
-- to roles, quota checks, action paths, exclusions, logs or return fields.
BEGIN READ ONLY;
DO $lr026_preserve_source$
DECLARE
  r record;
  patched text;
  reverted text;
  replacement text;
  original_anchor text;
  occurrence_count integer;
BEGIN
  FOR r IN SELECT rpc, original_source, original_md5
           FROM public.lr026_ci_source_snapshots
  LOOP
    IF r.rpc='draw_for_partner' THEN
      patched := pg_catalog.pg_get_functiondef(
        'public.draw_for_partner(uuid,text,boolean)'::pg_catalog.regprocedure);
      replacement := ' order by couple_private.love_variety_rank(' ||
        'p_session,s.couple_id,v_cat,card) ASC, random() limit 1;';
      original_anchor := ' order by random() limit 1;';
    ELSIF r.rpc='love_respond_and_redraw' THEN
      patched := pg_catalog.pg_get_functiondef(
        'public.love_respond_and_redraw(uuid,text,boolean)'::pg_catalog.regprocedure);
      replacement := ' ORDER BY couple_private.love_variety_rank(' ||
        'v_old.session_id,v_couple,v_old.category,candidate.card)' ||
        ' ASC, random() LIMIT 1;';
      original_anchor := ' ORDER BY random() LIMIT 1;';
    ELSE
      RAISE EXCEPTION 'LR-026: unexpected RPC source snapshot %', r.rpc;
    END IF;

    occurrence_count :=
      (pg_catalog.length(patched) -
       pg_catalog.length(pg_catalog.replace(patched,replacement,'')))
      / pg_catalog.length(replacement);
    IF occurrence_count<>1 THEN
      RAISE EXCEPTION 'LR-026: expected one ranking change in %, found %',
        r.rpc,occurrence_count;
    END IF;
    reverted := pg_catalog.replace(patched,replacement,original_anchor);
    IF reverted IS DISTINCT FROM r.original_source
       OR pg_catalog.md5(reverted)<>r.original_md5 THEN
      RAISE EXCEPTION 'LR-026: unrelated source changed in RPC %', r.rpc;
    END IF;
  END LOOP;
END; $lr026_preserve_source$;
ROLLBACK;
