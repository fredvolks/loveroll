-- LR-026 concurrency regression, disposable PostgreSQL CI only.
-- Synthetic quota/lock model derived from the inspected server lock order.
-- NOT the production RPC, and not a substitute for two real Supabase users.
-- This fixture is installed in a freshly-created throwaway database.
CREATE SCHEMA lr026_race;
CREATE TABLE lr026_race.couples (
 id integer PRIMARY KEY,
 partner_a uuid NOT NULL,
 partner_b uuid NOT NULL,
 monthly_pass_limit integer NOT NULL CHECK (monthly_pass_limit>=0)
);
CREATE TABLE lr026_race.challenges (
 id integer PRIMARY KEY,
 couple_id integer NOT NULL REFERENCES lr026_race.couples(id),
 recipient uuid NOT NULL,
 status text NOT NULL DEFAULT 'proposed',
 passed_at timestamptz,
 CHECK(status IN ('proposed','passed'))
);
-- CI installs the EXACT production pass-stamp function first. No manual
-- passed_at writes in the simulated quota RPC below.
CREATE TRIGGER love_stamp_passed_at BEFORE UPDATE OF status
 ON lr026_race.challenges FOR EACH ROW
 EXECUTE FUNCTION couple_private.love_stamp_challenge_pass();
INSERT INTO lr026_race.couples VALUES
 (1,'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
    'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb',1);
INSERT INTO lr026_race.challenges(id,couple_id,recipient) VALUES
 (101,1,'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'),
 (102,1,'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'),
 (201,1,'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb'),
 (202,1,'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb');

CREATE FUNCTION lr026_race.pass(p_id integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $lr026_race_fn$
DECLARE
 actor uuid := NULLIF(
    pg_catalog.current_setting('request.jwt.claim.sub',true),'')::uuid;
 couple_row lr026_race.couples%rowtype;
 card_row lr026_race.challenges%rowtype;
 used_count integer;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Missing identity'; END IF;

 -- Lock couple BEFORE challenge, matching the reviewed server RPC order.
 -- The short delay deliberately increases overlap between two SQL sessions.
 SELECT c.* INTO couple_row
 FROM lr026_race.couples c
 JOIN lr026_race.challenges ch ON ch.couple_id=c.id
 WHERE ch.id=p_id FOR UPDATE OF c;
 IF NOT FOUND OR actor NOT IN (couple_row.partner_a,couple_row.partner_b)
 THEN RAISE EXCEPTION 'Not a member'; END IF;
 PERFORM pg_catalog.pg_sleep(0.35);

 SELECT * INTO card_row FROM lr026_race.challenges
 WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR card_row.recipient IS DISTINCT FROM actor
 THEN RAISE EXCEPTION 'Only recipient may respond'; END IF;
 IF card_row.status='passed'
 THEN RETURN pg_catalog.jsonb_build_object(
   'already_processed',true,'id',p_id); END IF;

 SELECT pg_catalog.count(*) INTO used_count FROM lr026_race.challenges ch
 WHERE ch.couple_id=card_row.couple_id
   AND ch.recipient=actor AND ch.status='passed'
   AND ch.passed_at IS NOT NULL
   AND pg_catalog.date_trunc('month',
      ch.passed_at AT TIME ZONE 'America/Toronto')
     = pg_catalog.date_trunc('month',
      pg_catalog.now() AT TIME ZONE 'America/Toronto');
 IF used_count>=couple_row.monthly_pass_limit THEN
   RAISE EXCEPTION 'Monthly pass quota reached';
 END IF;

 UPDATE lr026_race.challenges
 SET status='passed' WHERE id=p_id;
 RETURN pg_catalog.jsonb_build_object(
   'already_processed',false,'id',p_id);
END; $lr026_race_fn$;

REVOKE ALL ON SCHEMA lr026_race FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA lr026_race FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION lr026_race.pass(integer) FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA lr026_race TO authenticated;
GRANT EXECUTE ON FUNCTION lr026_race.pass(integer) TO authenticated;
