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
