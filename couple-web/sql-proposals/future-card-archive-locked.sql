-- LoveRoll: staging-only SERVER ARCHIVE SCHEMA PROPOSAL.
-- DO NOT DEPLOY to Supabase without real A/B/outsider Auth and RLS staging tests.
-- Never changes the live D100, 80/20 category routing or payment grants.
-- There is NO client write/grant/checkout RPC: this table is intentionally READ-ONLY
-- to authenticated users until a verified server payment + regeneration
-- transaction and full 100-card content audit are implemented.
BEGIN;
CREATE TABLE IF NOT EXISTS public.love_future_card_archive_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
 member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 level text NOT NULL CHECK (level IN ('soft','medium','intense')),
 version_no integer NOT NULL CHECK (version_no >= 1),
 cards jsonb NOT NULL CHECK (
  jsonb_typeof(cards) = 'array' AND
  jsonb_array_length(cards) = 100 AND
  octet_length(cards::text) <= 750000
 ),
 source text NOT NULL CHECK (source IN ('initial','verified_regeneration')),
 recorded_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
 UNIQUE (couple_id,member_id,level,version_no)
);
CREATE INDEX IF NOT EXISTS love_future_card_archive_versions_latest
 ON public.love_future_card_archive_versions
 (couple_id,member_id,level,version_no DESC);

ALTER TABLE public.love_future_card_archive_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.love_future_card_archive_versions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.love_future_card_archive_versions
 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON TABLE public.love_future_card_archive_versions TO authenticated;
DROP POLICY IF EXISTS love_future_card_archive_owner_read
 ON public.love_future_card_archive_versions;
CREATE POLICY love_future_card_archive_owner_read
 ON public.love_future_card_archive_versions
 FOR SELECT TO authenticated USING (
  public.love_verified_identity()
  AND member_id = (SELECT auth.uid())
  AND couple_private.is_member(couple_id)
);
-- No INSERT, UPDATE, DELETE policies, no EXECUTE grants, no charge pathway.
-- Server-side code must validate owner membership in the same locked
-- transaction as entitlement receipt verification, unique card IDs and
-- archive version increment; this SQL alone must NEVER enable regeneration.
COMMIT;
