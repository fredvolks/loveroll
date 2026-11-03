-- LR-SURPRISE-001: never mistake a temporary Geoapify outage for no venues.
-- Additive, defaulted: no existing place/booking/history is rewritten.
-- Deploy this schema BEFORE deploying the matching Edge Function.
ALTER TABLE public.love_monthly_places
  ADD COLUMN IF NOT EXISTS geo_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS geo_total_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS driving_seconds integer NULL;

COMMENT ON COLUMN public.love_monthly_places.geo_attempts IS
  'Bounded automatic Geoapify attempts per D100 roll (1..3); manual restart after cooldown resets to 1.';

COMMENT ON COLUMN public.love_monthly_places.geo_total_attempts IS
  'All paid-lookup claim windows for this monthly roll, including manual retries, hard-capped at 6.';

-- Existing couple-scoped RLS policies and privileges are preserved.

COMMENT ON COLUMN public.love_monthly_places.driving_seconds IS
  'Verified Geoapify Route Matrix car travel time in seconds, NULL when missing; not a promise of live traffic.';
