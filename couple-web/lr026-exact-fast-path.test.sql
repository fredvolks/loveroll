-- Disposable PostgreSQL only. Instrument the expensive semantic comparator
-- to fail on every invocation; the exact-card fast path MUST NOT call it.
-- The transaction undoes the instrumentation and all synthetic rows.
BEGIN;

CREATE OR REPLACE FUNCTION couple_private.love_variety_near(
 p_title text,p_description text,p_old_title text,p_old_description text
) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path=''
AS $lr026_semantic_trap$
BEGIN
 RAISE EXCEPTION 'LR-026 semantic comparator unexpectedly invoked'
   USING ERRCODE='P0001';
END; $lr026_semantic_trap$;

DO $lr026_exact_fast_path$
DECLARE
  a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  session_id uuid := '11111111-1111-4111-8111-111111111111';
  semantic_exception text;
  call_observed boolean := false;
  exact_count integer;
BEGIN
 -- Both original and customized already-seen cards can take the id path.
 IF couple_private.love_variety_rank(session_id,a,'SENSUEL',1)<>1 THEN
   RAISE EXCEPTION 'LR-026: exact seen card did not rank as repeated';
 END IF;

 -- Verify the trap really works on NEW cards: otherwise this test is inert.
 BEGIN
   PERFORM couple_private.love_variety_rank(session_id,a,'SENSUEL',2);
 EXCEPTION WHEN raise_exception THEN
   GET STACKED DIAGNOSTICS semantic_exception = MESSAGE_TEXT;
   IF semantic_exception='LR-026 semantic comparator unexpectedly invoked' THEN
     call_observed := true;
   ELSE
     RAISE;
   END IF;
 END;
 IF NOT call_observed THEN
   RAISE EXCEPTION 'LR-026: semantic trap did not execute for new cards';
 END IF;

 -- A realistic 200-card evening: every exact hit must avoid the costly
 -- semantic comparator, regardless of its 199 potential history matches.
 INSERT INTO public.couple_challenges(
   couple_id,session_id,category,card_id,card_title,card_description)
 SELECT a,session_id,'SENSUEL',g,'Titre '||g,'Description '||g
 FROM pg_catalog.generate_series(10,209) AS g;
 SELECT pg_catalog.count(*) INTO exact_count
 FROM pg_catalog.generate_series(10,209) AS g
 WHERE couple_private.love_variety_rank(session_id,a,'SENSUEL',g)=1;
 IF exact_count<>200 THEN
    RAISE EXCEPTION 'LR-026: 200 exact fast-path cards not detected (%)',
      exact_count;
 END IF;

 -- The same id in another category cannot be confused with a repeated
 -- SENSUEL card; a new SEXUEL card must fall through to the semantic check.
 call_observed:=false;
 BEGIN
   PERFORM couple_private.love_variety_rank(session_id,a,'SEXUEL',1);
 EXCEPTION WHEN raise_exception THEN
   GET STACKED DIAGNOSTICS semantic_exception = MESSAGE_TEXT;
   IF semantic_exception='LR-026 semantic comparator unexpectedly invoked' THEN
     call_observed:=true;
   ELSE
     RAISE;
   END IF;
 END;
 -- There is no SEXUEL history so the semantic subquery is empty. The card
 -- should remain novel without needing to call the semantic comparator.
 IF call_observed THEN
   RAISE EXCEPTION 'LR-026: cross-category history was unexpectedly compared';
 END IF;
 IF couple_private.love_variety_rank(session_id,a,'SEXUEL',1)<>0 THEN
   RAISE EXCEPTION 'LR-026: unrelated D100 category incorrectly ranked';
 END IF;
END; $lr026_exact_fast_path$;

ROLLBACK;
