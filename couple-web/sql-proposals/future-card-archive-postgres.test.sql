-- Verify the staged archive never gives a client any write entitlement.
DO $$
BEGIN
 IF NOT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class
  WHERE oid='public.love_future_card_archive_versions'::regclass)
 THEN RAISE EXCEPTION 'Archive RLS must be enabled and forced'; END IF;
 IF has_table_privilege('authenticated',
  'public.love_future_card_archive_versions','INSERT')
 OR has_table_privilege('authenticated',
  'public.love_future_card_archive_versions','UPDATE')
 OR has_table_privilege('authenticated',
  'public.love_future_card_archive_versions','DELETE')
 OR has_table_privilege('anon','public.love_future_card_archive_versions','SELECT')
 THEN RAISE EXCEPTION 'Authenticated write or anonymous read detected';END IF;
END;
$$;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false);
DO $$
BEGIN
 IF (SELECT count(*) FROM public.love_future_card_archive_versions)<>1
 THEN RAISE EXCEPTION 'Owner A should see exactly own version'; END IF;
 IF (SELECT count(*) FROM public.love_future_card_archive_versions
  WHERE level='medium')<>0
 THEN RAISE EXCEPTION 'Partner B archive leaked to A'; END IF;
END;
$$;

SELECT set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',false);
DO $$
BEGIN
 IF (SELECT count(*) FROM public.love_future_card_archive_versions)<>1
 OR (SELECT count(*) FROM public.love_future_card_archive_versions
     WHERE level='medium')<>1
 THEN RAISE EXCEPTION 'Partner B should only see own Medium archive';END IF;
END;
$$;
SELECT set_config('request.jwt.claim.sub','cccccccc-cccc-cccc-cccc-cccccccccccc',false);
DO $$
BEGIN
 IF (SELECT count(*) FROM public.love_future_card_archive_versions)<>1
 OR (SELECT count(*) FROM public.love_future_card_archive_versions
     WHERE level='intense')<>1
 THEN RAISE EXCEPTION 'Outsider C should only see own unrelated couple'; END IF;
END;
$$;
SELECT set_config('request.jwt.claim.sub','',false);
DO $$
BEGIN
 IF (SELECT count(*) FROM public.love_future_card_archive_versions)<>0
 THEN RAISE EXCEPTION 'Anonymous identity with authenticated role leaked rows';END IF;
END;
$$;
RESET ROLE;


-- Even trusted server writes must never archive malformed metadata.
DO $tests$
DECLARE
 valid jsonb;
 malformed jsonb;
 payload jsonb;
 case_no integer:=0;
BEGIN
 valid:=public.future_archive_test_cards('soft');
 FOR malformed IN
  SELECT value FROM pg_catalog.jsonb_array_elements(pg_catalog.jsonb_build_array(
   -- Duplicate ID, invalid timer, missing own level, duplicated levels.
   pg_catalog.jsonb_set(valid,'{1,id}','"card-1"'::jsonb),
   pg_catalog.jsonb_set(valid,'{0,minutes}','7'::jsonb),
   pg_catalog.jsonb_set(valid,'{0,levels}','["intense"]'::jsonb),
   pg_catalog.jsonb_set(valid,'{0,levels}','["soft","soft"]'::jsonb),
   pg_catalog.jsonb_set(valid,'{0,target}','"unknown"'::jsonb),
   pg_catalog.jsonb_set(valid,'{0,title}','"<script>bad</script>"'::jsonb),
   pg_catalog.jsonb_set(valid,'{0,title}','"Défi original numéro 2 en soft"'::jsonb)
  ))
 LOOP
  case_no:=case_no+1;
  BEGIN
   INSERT INTO public.love_future_card_archive_versions
    (couple_id,member_id,level,version_no,cards,source)
   VALUES ('11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'soft',100+case_no,malformed,'initial');
   RAISE EXCEPTION 'Malformed archive % accepted',case_no;
  EXCEPTION WHEN check_violation THEN NULL;
  END;
 END LOOP;
 -- All 100 cards assigned to "both" must fail target balance.
 SELECT pg_catalog.jsonb_agg(
  pg_catalog.jsonb_set(value,'{target}','"both"'::jsonb)
 ) INTO payload FROM pg_catalog.jsonb_array_elements(valid);
 BEGIN
  INSERT INTO public.love_future_card_archive_versions
    (couple_id,member_id,level,version_no,cards,source)
  VALUES ('11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','soft',200,payload,'initial');
  RAISE EXCEPTION 'Unbalanced archive accepted';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 -- Invalid container type is rejected rather than causing a query abort.
 BEGIN
  INSERT INTO public.love_future_card_archive_versions
    (couple_id,member_id,level,version_no,cards,source)
  VALUES ('11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','soft',201,
    '{}'::jsonb,'initial');
  RAISE EXCEPTION 'Object instead of array accepted';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
END;
$tests$;

-- Constraint on 100 cards must refuse even privileged malformed data.
DO $$
BEGIN
 BEGIN
  INSERT INTO public.love_future_card_archive_versions
   (couple_id,member_id,level,version_no,cards,source)
  VALUES
   ('11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'soft',2,'[]'::jsonb,'initial');
  RAISE EXCEPTION 'An empty 100-card archive was accepted';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
END;
$$;
