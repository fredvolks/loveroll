-- Disposable PostgreSQL integration: signed proof is simulated as preverified.
-- NO Stripe network, real payment, Supabase service credentials or production.
DO $proof$
DECLARE
 id_a uuid;
 id_retry uuid;
 n integer;
BEGIN
 IF has_table_privilege('authenticated',
 'couple_private.love_future_stripe_test_intents','SELECT')
 OR has_table_privilege('authenticated',
 'couple_private.love_future_stripe_test_intents','INSERT')
 OR has_table_privilege('anon',
 'couple_private.love_future_stripe_test_intents','SELECT')
 OR has_function_privilege('authenticated',
 'couple_private.record_future_stripe_test_receipt(uuid,text,text,uuid,uuid,text,integer,text,timestamptz)','EXECUTE')
 OR has_function_privilege('anon',
 'couple_private.record_future_stripe_test_receipt(uuid,text,text,uuid,uuid,text,integer,text,timestamptz)','EXECUTE')
 THEN RAISE EXCEPTION 'Client can access test payment intents or proof recorder';END IF;

 INSERT INTO couple_private.love_future_stripe_test_intents (
  id,couple_id,member_id,level,checkout_session_id,amount_cad_cents,currency
 ) VALUES
 ('eeeeeeee-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','soft',
  'cs_test_love_a_abcdefgh123456',400,'cad'),
 ('eeeeeeee-0000-0000-0000-000000000002',
  '11111111-1111-1111-1111-111111111111',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','medium',
  'cs_test_love_b_abcdefgh123456',400,'cad'),
 ('eeeeeeee-0000-0000-0000-000000000003',
  '11111111-1111-1111-1111-111111111111',
  'cccccccc-cccc-cccc-cccc-cccccccccccc','soft',
  'cs_test_love_nonmember_abcdefg',400,'cad'),
 ('eeeeeeee-0000-0000-0000-000000000004',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','soft',
  'cs_test_love_cancelled_abcdef',400,'cad');
 UPDATE couple_private.love_future_stripe_test_intents
 SET status='cancelled'
 WHERE id='eeeeeeee-0000-0000-0000-000000000004';

 -- Must NOT change any receipt when the proof contradicts the server intent.
 BEGIN
  PERFORM couple_private.record_future_stripe_test_receipt(
   'eeeeeeee-0000-0000-0000-000000000001',
   'cs_test_love_a_abcdefgh123456','evt_syntheticproof12345',
   '11111111-1111-1111-1111-111111111111',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','soft',
   400,'cad',transaction_timestamp());
  RAISE EXCEPTION 'Mismatched member proof accepted';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM='Mismatched member proof accepted' THEN RAISE;END IF;
 END;
 BEGIN
  PERFORM couple_private.record_future_stripe_test_receipt(
   'eeeeeeee-0000-0000-0000-000000000001',
   'cs_test_love_a_abcdefgh123456','evt_syntheticproof12345',
   '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','intense',
   400,'cad',transaction_timestamp());
  RAISE EXCEPTION 'Mismatched level proof accepted';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM='Mismatched level proof accepted' THEN RAISE;END IF;
 END;
 BEGIN
  PERFORM couple_private.record_future_stripe_test_receipt(
   'eeeeeeee-0000-0000-0000-000000000001',
   'cs_test_love_a_abcdefgh123456','evt_syntheticproof12345',
   '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','soft',
   401,'cad',transaction_timestamp());
  RAISE EXCEPTION 'Wrong amount proof accepted';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM='Wrong amount proof accepted' THEN RAISE;END IF;
 END;

 id_a:=couple_private.record_future_stripe_test_receipt(
  'eeeeeeee-0000-0000-0000-000000000001',
  'cs_test_love_a_abcdefgh123456','evt_syntheticproof12345',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','soft',
  400,'cad',transaction_timestamp());
 id_retry:=couple_private.record_future_stripe_test_receipt(
  'eeeeeeee-0000-0000-0000-000000000001',
  'cs_test_love_a_abcdefgh123456','evt_syntheticproof12345',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','soft',
  400,'cad',transaction_timestamp());
 IF id_a IS DISTINCT FROM id_retry OR id_a IS NULL
 THEN RAISE EXCEPTION 'Same signed event should be idempotent';END IF;
 SELECT COUNT(*) INTO n FROM couple_private.love_future_verified_regen_receipts
 WHERE checkout_intent_id='eeeeeeee-0000-0000-0000-000000000001';
 IF n<>1 THEN RAISE EXCEPTION 'Exactly one receipt per server intent';END IF;
 IF (SELECT status FROM couple_private.love_future_stripe_test_intents
  WHERE id='eeeeeeee-0000-0000-0000-000000000001')<>'receipt_verified'
 THEN RAISE EXCEPTION 'Verified intent status not committed';END IF;

 BEGIN
  PERFORM couple_private.record_future_stripe_test_receipt(
   'eeeeeeee-0000-0000-0000-000000000001',
   'cs_test_love_a_abcdefgh123456','evt_differentproof12345',
   '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','soft',
   400,'cad',transaction_timestamp());
  RAISE EXCEPTION 'Conflicting event replay was accepted';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM='Conflicting event replay was accepted' THEN RAISE;END IF;
 END;

 -- A second member cannot spend a receipt for another member.
 BEGIN
  PERFORM couple_private.record_future_stripe_test_receipt(
   'eeeeeeee-0000-0000-0000-000000000003',
   'cs_test_love_nonmember_abcdefg','evt_nonmemberproof12345',
   '11111111-1111-1111-1111-111111111111',
   'cccccccc-cccc-cccc-cccc-cccccccccccc','soft',
   400,'cad',transaction_timestamp());
  RAISE EXCEPTION 'Outsider receipt recorded';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM='Outsider receipt recorded' THEN RAISE;END IF;
 END;
 BEGIN
  PERFORM couple_private.record_future_stripe_test_receipt(
   'eeeeeeee-0000-0000-0000-000000000004',
   'cs_test_love_cancelled_abcdef','evt_cancelledproof12345',
   '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','soft',
   400,'cad',transaction_timestamp());
  RAISE EXCEPTION 'Cancelled checkout became payable';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM='Cancelled checkout became payable' THEN RAISE;END IF;
 END;

 -- A completely unrelated partner gets an independent receipt.
 PERFORM couple_private.record_future_stripe_test_receipt(
  'eeeeeeee-0000-0000-0000-000000000002',
  'cs_test_love_b_abcdefgh123456','evt_secondmember12345',
  '11111111-1111-1111-1111-111111111111',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','medium',
  400,'cad',transaction_timestamp());
 IF (SELECT COUNT(*) FROM couple_private.love_future_verified_regen_receipts
  WHERE checkout_intent_id IS NOT NULL)<>2
 THEN RAISE EXCEPTION 'One receipt per eligible member expected';END IF;
END;
$proof$;
