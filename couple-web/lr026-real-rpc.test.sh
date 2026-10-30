#!/usr/bin/env bash
# CI ONLY: executes exact production RPC *code* on disposable PostgreSQL.
# No real Supabase Auth (JWT claims are simulated), no user cards, no hosted
# connections and no writes outside this new ephemeral test database.
set -euo pipefail
if [[ "${PGDATABASE:-}" != "lr026_test" ]]; then
  echo "::error::This test requires the dedicated disposable PGDATABASE=lr026_test"
  exit 1
fi
DB="lr026_real_rpc_test"
createdb "$DB"
psql -X -d "$DB" -v ON_ERROR_STOP=1 \
  -f couple-web/lr026-real-rpc-schema.sql >/dev/null
psql -X -d "$DB" -v ON_ERROR_STOP=1 \
  -f couple-web/lr026-real-rpc-snapshot.sql >/dev/null
psql -X -d "$DB" -v ON_ERROR_STOP=1 \
  -f couple-web/lr026-pass-stamp-fixture.sql >/dev/null
psql -X -d "$DB" -v ON_ERROR_STOP=1 >/dev/null <<'SQL'
CREATE TRIGGER love_stamp_passed_at
 BEFORE UPDATE OF status ON public.couple_challenges FOR EACH ROW
 EXECUTE FUNCTION couple_private.love_stamp_challenge_pass();
REVOKE ALL ON FUNCTION public.draw_for_partner(uuid,text,boolean)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.love_respond_and_redraw(uuid,text,boolean)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.draw_for_partner(uuid,text,boolean)
 TO authenticated;
GRANT EXECUTE ON FUNCTION public.love_respond_and_redraw(uuid,text,boolean)
 TO authenticated;
SQL
DRAW_HASH="$(psql -X -d "$DB" -At -v ON_ERROR_STOP=1 \
 -c "SELECT md5(pg_get_functiondef('public.draw_for_partner(uuid,text,boolean)'::regprocedure))")"
REDRAW_HASH="$(psql -X -d "$DB" -At -v ON_ERROR_STOP=1 \
 -c "SELECT md5(pg_get_functiondef('public.love_respond_and_redraw(uuid,text,boolean)'::regprocedure))")"
if [[ "$DRAW_HASH" != "b85aab4563ec7e04956bd059d91479fa"
   || "$REDRAW_HASH" != "d3b15210682919a56242ba996994f6b2" ]]; then
  echo "::error::Actual RPC source fingerprints drifted after copying into disposable PostgreSQL"
  printf 'draw hash: %s; redraw hash: %s\n' "$DRAW_HASH" "$REDRAW_HASH"
  exit 1
fi
STAMP_HASH="$(psql -X -d "$DB" -At -v ON_ERROR_STOP=1 \
 -c "SELECT md5(pg_get_functiondef('couple_private.love_stamp_challenge_pass()'::regprocedure))")"
if [[ "$STAMP_HASH" != "3241da749bd0647c6106c613c7e3615a" ]]; then
 echo "::error::Pass timestamp source does not match live reviewed function"
 exit 1
fi
# Exercise the REAL guarded production migration unchanged: fingerprints
# match the actual reviewed sources, so NO fixture replacement is needed.
psql -X -d "$DB" -v ON_ERROR_STOP=1 \
 -f couple-web/lr026-server-variety.sql >/dev/null
psql -X -d "$DB" -v ON_ERROR_STOP=1 \
 -f couple-web/lr026-real-rpc-e2e.test.sql
echo "LR-026: actual production D100 and redraw RPC bodies passed isolated A/B integration"
