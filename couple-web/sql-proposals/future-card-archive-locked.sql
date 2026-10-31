-- LoveRoll: staging-only SERVER ARCHIVE SCHEMA PROPOSAL.
-- DO NOT DEPLOY to Supabase without real A/B/outsider Auth and RLS staging tests.
-- Never changes the live D100, 80/20 category routing or payment grants.
-- There is NO client write/grant/checkout RPC: this table is intentionally READ-ONLY
-- to authenticated users until a verified server payment + regeneration
-- transaction and full 100-card content audit are implemented.
BEGIN;
-- Validate all 100 original cards before a trusted backend may archive them.
-- No client EXECUTE rights and no grant of paid entitlements.
CREATE OR REPLACE FUNCTION couple_private.love_future_archive_cards_valid(
 p_cards jsonb,p_level text
) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $validate$
DECLARE
 entry jsonb;
 level_item jsonb;
 card_id text;
 title text;
 description text;
 target text;
 minute_text text;
 ids text[]:=ARRAY[]::text[];
 titles text[]:=ARRAY[]::text[];
 seen_levels text[];
 members_level boolean;
 count_woman integer:=0;
 count_man integer:=0;
 count_both integer:=0;
BEGIN
 IF p_level IS NULL OR p_level NOT IN ('soft','medium','intense')
  OR pg_catalog.jsonb_typeof(p_cards) IS DISTINCT FROM 'array' THEN RETURN false;END IF;
 IF pg_catalog.jsonb_array_length(p_cards)<>100
  OR pg_catalog.octet_length(p_cards::text)>750000 THEN RETURN false;END IF;
 FOR entry IN SELECT value FROM pg_catalog.jsonb_array_elements(p_cards) LOOP
  IF pg_catalog.jsonb_typeof(entry) IS DISTINCT FROM 'object'
   THEN RETURN false;END IF;
  card_id:=entry->>'id';
  title:=pg_catalog.btrim(entry->>'title');
  description:=pg_catalog.btrim(entry->>'description');
  target:=entry->>'target';
  minute_text:=entry->>'minutes';
  IF card_id IS NULL OR card_id !~ '^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$'
   OR card_id=ANY(ids) THEN RETURN false;END IF;
  ids:=pg_catalog.array_append(ids,card_id);
  IF title IS NULL OR pg_catalog.char_length(title) NOT BETWEEN 5 AND 120
   OR title ~ '[<>[:cntrl:]]' OR pg_catalog.lower(title)=ANY(titles)
   OR description IS NULL OR pg_catalog.char_length(description) NOT BETWEEN 15 AND 1200
   OR description ~ '[<>[:cntrl:]]'
   THEN RETURN false;END IF;
  titles:=pg_catalog.array_append(titles,pg_catalog.lower(title));
  IF pg_catalog.jsonb_typeof(entry->'minutes') IS DISTINCT FROM 'number'
   OR minute_text !~ '^[2-6]$' THEN RETURN false;END IF;
  IF target IS NULL OR target NOT IN ('woman','man','both')
   THEN RETURN false;END IF;
  IF target='woman' THEN count_woman:=count_woman+1;
  ELSIF target='man' THEN count_man:=count_man+1;
  ELSE count_both:=count_both+1;END IF;
  IF pg_catalog.jsonb_typeof(entry->'levels') IS DISTINCT FROM 'array'
   OR pg_catalog.jsonb_array_length(entry->'levels') NOT BETWEEN 1 AND 3
   THEN RETURN false;END IF;
  members_level:=false;
  seen_levels:=ARRAY[]::text[];
  FOR level_item IN SELECT value FROM pg_catalog.jsonb_array_elements(entry->'levels') LOOP
   IF pg_catalog.jsonb_typeof(level_item) IS DISTINCT FROM 'string'
    OR (level_item #>> '{}') NOT IN ('soft','medium','intense')
    OR (level_item #>> '{}')=ANY(seen_levels) THEN RETURN false;END IF;
   seen_levels:=pg_catalog.array_append(seen_levels,level_item #>> '{}');
   IF (level_item #>> '{}')=p_level THEN members_level:=true;END IF;
  END LOOP;
  IF NOT members_level THEN RETURN false;END IF;
 END LOOP;
 RETURN GREATEST(count_woman,count_man,count_both)-
  LEAST(count_woman,count_man,count_both)<=1;
END;
$validate$;
REVOKE ALL ON FUNCTION couple_private.love_future_archive_cards_valid(jsonb,text)
 FROM PUBLIC,anon,authenticated;

CREATE TABLE IF NOT EXISTS public.love_future_card_archive_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
 member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 level text NOT NULL CHECK (level IN ('soft','medium','intense')),
 version_no integer NOT NULL CHECK (version_no >= 1),
 cards jsonb NOT NULL CHECK (
  couple_private.love_future_archive_cards_valid(cards,level)
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
