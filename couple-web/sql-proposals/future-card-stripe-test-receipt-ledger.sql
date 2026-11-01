-- FUTURE/TEST ONLY: verified webhook proof -> durable Stripe test receipt.
-- INACTIVE proposal: do not deploy on production Supabase.
-- A trusted server creates an intent and independently validates the Stripe
-- webhook HMAC before invoking this function. PostgreSQL cannot verify HMAC.
-- No client grants, checkout initiation, real charges or D100 changes.
BEGIN;
CREATE TABLE IF NOT EXISTS couple_private.love_future_stripe_test_intents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
 member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 level text NOT NULL CHECK (level IN ('soft','medium','intense')),
 checkout_session_id text NOT NULL UNIQUE
  CHECK (checkout_session_id ~ '^cs_test_[A-Za-z0-9_]{8,240}$'),
 amount_cad_cents integer NOT NULL CHECK (amount_cad_cents=400),
 currency text NOT NULL CHECK (currency='cad'),
 status text NOT NULL DEFAULT 'awaiting_payment'
  CHECK (status IN ('awaiting_payment','receipt_verified','cancelled')),
 created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
 verified_at timestamptz
);
ALTER TABLE couple_private.love_future_stripe_test_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_private.love_future_stripe_test_intents FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE couple_private.love_future_stripe_test_intents
 FROM PUBLIC,anon,authenticated;

-- Preserve prior synthetic/staged receipts while enforcing unique linkage
-- for all NEW Stripe proof-based receipts.
ALTER TABLE couple_private.love_future_verified_regen_receipts
 ADD COLUMN IF NOT EXISTS checkout_intent_id uuid
  REFERENCES couple_private.love_future_stripe_test_intents(id),
 ADD COLUMN IF NOT EXISTS provider_event_id text;
CREATE UNIQUE INDEX IF NOT EXISTS love_future_receipt_intent_once
 ON couple_private.love_future_verified_regen_receipts(checkout_intent_id);
CREATE UNIQUE INDEX IF NOT EXISTS love_future_receipt_provider_event_once
 ON couple_private.love_future_verified_regen_receipts(provider_event_id);

-- Call ONLY after verifying signed raw Stripe test-mode payload + matching
-- trusted intent. An authenticated client never receives EXECUTE rights.
CREATE OR REPLACE FUNCTION couple_private.record_future_stripe_test_receipt(
 p_intent_id uuid,p_checkout_session_id text,p_provider_event_id text,
 p_couple_id uuid,p_member_id uuid,p_level text,
 p_amount_cad_cents integer,p_currency text,p_verified_at timestamptz
) RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY INVOKER
 SET search_path='' AS $record$
DECLARE
 v_intent couple_private.love_future_stripe_test_intents%ROWTYPE;
 v_existing couple_private.love_future_verified_regen_receipts%ROWTYPE;
 v_receipt_id uuid;
 v_now timestamptz:=transaction_timestamp();
BEGIN
 IF p_intent_id IS NULL OR p_couple_id IS NULL OR p_member_id IS NULL
 OR p_verified_at IS NULL OR p_level IS NULL OR p_currency IS NULL
 OR p_checkout_session_id IS NULL OR
  p_checkout_session_id !~ '^cs_test_[A-Za-z0-9_]{8,240}$'
 OR p_provider_event_id IS NULL OR
  p_provider_event_id !~ '^evt_[A-Za-z0-9]{8,240}$'
 OR p_amount_cad_cents IS DISTINCT FROM 400 OR p_currency<>'cad'
 OR p_level NOT IN ('soft','medium','intense')
 OR p_verified_at < v_now-INTERVAL '5 minutes'
 OR p_verified_at > v_now+INTERVAL '5 minutes'
 THEN RAISE EXCEPTION 'Verified Stripe test proof required';END IF;

 -- The intent row lock serializes concurrent identical webhook retries.
 SELECT * INTO v_intent FROM couple_private.love_future_stripe_test_intents
 WHERE id=p_intent_id FOR UPDATE;
 IF NOT FOUND
 OR v_intent.checkout_session_id IS DISTINCT FROM p_checkout_session_id
 OR v_intent.couple_id IS DISTINCT FROM p_couple_id
 OR v_intent.member_id IS DISTINCT FROM p_member_id
 OR v_intent.level IS DISTINCT FROM p_level
 OR v_intent.amount_cad_cents IS DISTINCT FROM p_amount_cad_cents
 OR v_intent.currency IS DISTINCT FROM p_currency
 THEN RAISE EXCEPTION 'Server-issued intent does not match verified proof';END IF;
 IF NOT EXISTS (
  SELECT 1 FROM public.couple_members m
  WHERE m.couple_id=v_intent.couple_id AND m.user_id=v_intent.member_id
 ) THEN RAISE EXCEPTION 'Active couple membership required';END IF;

 SELECT * INTO v_existing
 FROM couple_private.love_future_verified_regen_receipts
 WHERE checkout_intent_id=p_intent_id;
 IF v_intent.status='receipt_verified' THEN
  IF v_existing.id IS NOT NULL
   AND v_existing.provider_ref=p_checkout_session_id
   AND v_existing.provider_event_id=p_provider_event_id
   AND v_existing.couple_id=p_couple_id
   AND v_existing.member_id=p_member_id
   AND v_existing.level=p_level
   AND v_existing.amount_cad_cents=p_amount_cad_cents
  THEN RETURN v_existing.id;END IF;
  RAISE EXCEPTION 'Payment proof replay conflicts with recorded receipt';
 END IF;
 IF v_intent.status<>'awaiting_payment' OR v_existing.id IS NOT NULL
 THEN RAISE EXCEPTION 'Payment intent is unavailable';END IF;
 INSERT INTO couple_private.love_future_verified_regen_receipts (
  couple_id,member_id,level,provider_ref,amount_cad_cents,verified_at,
  checkout_intent_id,provider_event_id
 ) VALUES (
  v_intent.couple_id,v_intent.member_id,v_intent.level,
  p_checkout_session_id,p_amount_cad_cents,p_verified_at,
  p_intent_id,p_provider_event_id
 ) RETURNING id INTO v_receipt_id;
 UPDATE couple_private.love_future_stripe_test_intents
 SET status='receipt_verified',verified_at=v_now WHERE id=p_intent_id;
 RETURN v_receipt_id;
END;
$record$;
REVOKE ALL ON FUNCTION couple_private.record_future_stripe_test_receipt(
 uuid,text,text,uuid,uuid,text,integer,text,timestamptz)
 FROM PUBLIC,anon,authenticated;
COMMIT;
