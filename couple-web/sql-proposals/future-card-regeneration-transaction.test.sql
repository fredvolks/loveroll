-- All synthetic; no Supabase credentials, actual payment or live D100.
DO $t$
DECLARE
 id_a uuid;
 id_b uuid;
 id_c uuid;
 r couple_private.love_future_verified_regen_receipts%ROWTYPE;
 old_count integer;
BEGIN
 IF has_table_privilege('authenticated',
  'couple_private.love_future_verified_regen_receipts','INSERT')
 OR has_table_privilege('authenticated',
  'couple_private.love_future_verified_regen_receipts','SELECT')
 OR has_function_privilege('authenticated',
  'couple_private.apply_future_archive_regeneration(uuid,jsonb)','EXECUTE')
 OR has_function_privilege('anon',
  'couple_private.apply_future_archive_regeneration(uuid,jsonb)','EXECUTE')
 THEN RAISE EXCEPTION 'Client can see payment proof or invoke trusted operation';END IF;
 SELECT COUNT(*) INTO old_count FROM public.love_future_card_archive_versions;
 IF old_count<>3 THEN RAISE EXCEPTION 'Expected exactly three baselines';END IF;
 id_a:=couple_private.apply_future_archive_regeneration(
  'dddddddd-0000-0000-0000-000000000001',
  public.future_archive_test_regen_cards('soft','a'));
 IF id_a IS NULL THEN RAISE EXCEPTION 'Expected A archive version';END IF;
 IF (SELECT COUNT(*) FROM public.love_future_card_archive_versions
  WHERE couple_id='11111111-1111-1111-1111-111111111111'
   AND member_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
   AND level='soft')<>2 THEN RAISE EXCEPTION 'Original A archive lost';END IF;
 SELECT * INTO r FROM couple_private.love_future_verified_regen_receipts
  WHERE id='dddddddd-0000-0000-0000-000000000001';
 IF r.archive_id IS DISTINCT FROM id_a OR r.consumed_at IS NULL
 THEN RAISE EXCEPTION 'A receipt and archive were not committed atomically';END IF;

 -- The same receipt can never be consumed again.
 BEGIN
  PERFORM couple_private.apply_future_archive_regeneration(
   'dddddddd-0000-0000-0000-000000000001',
   public.future_archive_test_regen_cards('soft','a-again'));
  RAISE EXCEPTION 'Duplicate receipt accepted';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM='Duplicate receipt accepted' THEN RAISE;END IF;
 END;

 -- Even a distinct verified receipt cannot bypass two calendar months.
 BEGIN
  PERFORM couple_private.apply_future_archive_regeneration(
   'dddddddd-0000-0000-0000-000000000002',
   public.future_archive_test_regen_cards('soft','a-next'));
  RAISE EXCEPTION 'Cooldown bypassed';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM='Cooldown bypassed' THEN RAISE;END IF;
 END;
 IF (SELECT consumed_at FROM couple_private.love_future_verified_regen_receipts
  WHERE id='dddddddd-0000-0000-0000-000000000002') IS NOT NULL
 THEN RAISE EXCEPTION 'Blocked receipt was consumed'; END IF;

 -- Per-member, per-level independence: B and C can each generate.
 id_b:=couple_private.apply_future_archive_regeneration(
  'dddddddd-0000-0000-0000-000000000003',
  public.future_archive_test_regen_cards('medium','b'));
 id_c:=couple_private.apply_future_archive_regeneration(
  'dddddddd-0000-0000-0000-000000000005',
  public.future_archive_test_regen_cards('intense','c'));
 IF id_b IS NULL OR id_c IS NULL OR id_b=id_c
 THEN RAISE EXCEPTION 'Partner isolation failed';END IF;

 -- A synthetic verified receipt cannot be redirected to a non-member.
 BEGIN
  PERFORM couple_private.apply_future_archive_regeneration(
   'dddddddd-0000-0000-0000-000000000004',
   public.future_archive_test_regen_cards('soft','outsider'));
  RAISE EXCEPTION 'Cross-couple receipt accepted';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM='Cross-couple receipt accepted' THEN RAISE;END IF;
 END;
 IF (SELECT COUNT(*) FROM public.love_future_card_archive_versions)<>6
 THEN RAISE EXCEPTION 'Expected three old + three new versions';END IF;
END;
$t$;

-- Separate transaction to demonstrate history and anti-repeat at a future date:
-- moving a timestamp is allowed ONLY in this synthetic, throwaway fixture.
UPDATE public.love_future_card_archive_versions
 SET recorded_at=recorded_at-INTERVAL '3 months'
 WHERE source='verified_regeneration' AND member_id=
 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
DO $reuse$
BEGIN
 BEGIN
  PERFORM couple_private.apply_future_archive_regeneration(
   'dddddddd-0000-0000-0000-000000000002',
   public.future_archive_test_regen_cards('soft','a'));
  RAISE EXCEPTION 'Recycled cards were accepted after cooldown';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM='Recycled cards were accepted after cooldown' THEN RAISE;END IF;
 END;
 IF (SELECT consumed_at FROM couple_private.love_future_verified_regen_receipts
  WHERE id='dddddddd-0000-0000-0000-000000000002') IS NOT NULL
 THEN RAISE EXCEPTION 'Rejected recycled receipt was consumed';END IF;
END;
$reuse$;
