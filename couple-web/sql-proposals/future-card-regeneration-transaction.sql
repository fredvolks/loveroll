-- FUTURE ONLY / STAGING ONLY. Do not run on live Supabase.
-- A verified provider receipt must first be inserted by a trusted backend
-- after out-of-band verification. This file DOES NOT verify real payments,
-- grant entitlements, publish cards or alter the existing D100.
BEGIN;
CREATE TABLE IF NOT EXISTS couple_private.love_future_verified_regen_receipts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
 member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 level text NOT NULL CHECK (level IN ('soft','medium','intense')),
 provider_ref text NOT NULL UNIQUE CHECK (length(btrim(provider_ref)) BETWEEN 8 AND 200),
 amount_cad_cents integer NOT NULL CHECK (amount_cad_cents=400),
 verified_at timestamptz NOT NULL,
 consumed_at timestamptz,
 archive_id uuid UNIQUE REFERENCES public.love_future_card_archive_versions(id),
 CHECK ((consumed_at IS NULL)=(archive_id IS NULL))
);
ALTER TABLE couple_private.love_future_verified_regen_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_private.love_future_verified_regen_receipts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE couple_private.love_future_verified_regen_receipts
 FROM PUBLIC,anon,authenticated;

-- Transactional trusted-worker-only operation.
-- Receipts are evidence of an independently verified 400-cent payment,
-- not something a client can write. No public or authenticated EXECUTE.
-- Canonical two-calendar-month UTC clamp, aligned with the client preview:
-- 31 December -> 28/29 February, NOT early March.
CREATE OR REPLACE FUNCTION couple_private.love_future_regen_next_utc(
 p_previous timestamptz
) RETURNS timestamptz LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $next$
DECLARE
 v_utc timestamp;
 v_month timestamp;
 v_last_day integer;
 v_day integer;
BEGIN
 IF p_previous IS NULL THEN RETURN NULL;END IF;
 v_utc:=p_previous AT TIME ZONE 'UTC';
 v_month:=date_trunc('month',v_utc)+INTERVAL '2 months';
 v_last_day:=EXTRACT(day FROM (v_month+INTERVAL '1 month - 1 day'))::integer;
 v_day:=LEAST(EXTRACT(day FROM v_utc)::integer,v_last_day);
 RETURN (v_month+(v_day-1)*INTERVAL '1 day'
  +(v_utc-date_trunc('day',v_utc))) AT TIME ZONE 'UTC';
END;
$next$;
REVOKE ALL ON FUNCTION couple_private.love_future_regen_next_utc(timestamptz)
 FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION couple_private.apply_future_archive_regeneration(
 p_receipt_id uuid,p_cards jsonb
) RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path='' AS $apply$
DECLARE
 r couple_private.love_future_verified_regen_receipts%ROWTYPE;
 v_now timestamptz:=transaction_timestamp();
 v_latest integer;
 v_last_generated timestamptz;
 v_baseline integer;
 v_next timestamptz;
 v_archive uuid;
 v_overlap boolean;
BEGIN
 IF p_receipt_id IS NULL THEN RAISE EXCEPTION 'Verified receipt required';END IF;
 SELECT * INTO r FROM couple_private.love_future_verified_regen_receipts
 WHERE id=p_receipt_id FOR UPDATE;
 IF NOT FOUND OR r.consumed_at IS NOT NULL OR r.archive_id IS NOT NULL
  OR r.verified_at>v_now OR r.amount_cad_cents<>400
 THEN RAISE EXCEPTION 'Verified unused receipt required';END IF;
 -- Serializes simultaneous attempts with different receipts for the same couple.
 PERFORM 1 FROM public.couples WHERE id=r.couple_id FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(
  SELECT 1 FROM public.couple_members m
  WHERE m.couple_id=r.couple_id AND m.user_id=r.member_id
 ) THEN RAISE EXCEPTION 'Active couple membership required';END IF;
 IF couple_private.love_future_archive_cards_valid(p_cards,r.level) IS DISTINCT FROM TRUE
 THEN RAISE EXCEPTION '100 complete balanced original cards required';END IF;
 SELECT COALESCE(MAX(version_no),0),
  MAX(recorded_at) FILTER(WHERE source='verified_regeneration'),
  COUNT(*) FILTER(WHERE source='initial' AND version_no=1)
 INTO v_latest,v_last_generated,v_baseline
 FROM public.love_future_card_archive_versions
 WHERE couple_id=r.couple_id AND member_id=r.member_id AND level=r.level;
 IF v_baseline<>1 THEN RAISE EXCEPTION 'Initial version is required';END IF;
 IF v_last_generated IS NOT NULL THEN
  -- Two full calendar months: clamp the day at month end in UTC.
  v_next:=couple_private.love_future_regen_next_utc(v_last_generated);
  IF v_now<v_next THEN
   RAISE EXCEPTION 'Two-calendar-month cooldown has not expired';
  END IF;
 END IF;
 -- Across ALL historical versions of this same member and level,
 -- reject repeated card identities or case-insensitive titles.
 SELECT EXISTS(
  SELECT 1
  FROM public.love_future_card_archive_versions old
  CROSS JOIN LATERAL pg_catalog.jsonb_array_elements(old.cards) old_card
  JOIN LATERAL pg_catalog.jsonb_array_elements(p_cards) new_card
    ON old_card->>'id'=new_card->>'id'
    OR pg_catalog.lower(pg_catalog.btrim(old_card->>'title'))=
       pg_catalog.lower(pg_catalog.btrim(new_card->>'title'))
  WHERE old.couple_id=r.couple_id AND old.member_id=r.member_id
   AND old.level=r.level
 ) INTO v_overlap;
 IF v_overlap THEN RAISE EXCEPTION 'Recycled cards are forbidden';END IF;
 INSERT INTO public.love_future_card_archive_versions
  (couple_id,member_id,level,version_no,cards,source,recorded_at)
 VALUES(r.couple_id,r.member_id,r.level,v_latest+1,p_cards,
  'verified_regeneration',v_now)
 RETURNING id INTO v_archive;
 UPDATE couple_private.love_future_verified_regen_receipts
 SET consumed_at=v_now,archive_id=v_archive WHERE id=p_receipt_id;
 RETURN v_archive;
END;
$apply$;
REVOKE ALL ON FUNCTION couple_private.apply_future_archive_regeneration(uuid,jsonb)
 FROM PUBLIC,anon,authenticated;
COMMIT;
