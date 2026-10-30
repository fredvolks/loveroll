#!/usr/bin/env bash
# Concurrent client SQL sessions in a disposable GitHub Actions PostgreSQL DB.
# Models the existing couple-then-card lock protocol; DOES NOT call real
# LoveRoll production RPCs or use genuine Supabase Auth/JWTs.
set -euo pipefail

if [[ "${PGDATABASE:-}" != "lr026_test" ]]; then
  echo "::error::Refusing concurrent fixtures outside the isolated CI database"
  exit 1
fi
DB="lr026_race_test"
TMP="${RUNNER_TEMP:-/tmp}/lr026-race-$$"
mkdir -p "$TMP"
trap 'rm -rf "$TMP"' EXIT

createdb "$DB"
psql -X -d "$DB" -v ON_ERROR_STOP=1 \
  -c "CREATE SCHEMA couple_private" >/dev/null
psql -X -d "$DB" -v ON_ERROR_STOP=1 \
  -f couple-web/lr026-pass-stamp-fixture.sql >/dev/null
psql -X -d "$DB" -v ON_ERROR_STOP=1 \
  -f couple-web/lr026-concurrent-pass-fixture.sql >/dev/null
# Prove the copied function actually matched the production fingerprint.
stamp_sha="$(psql -X -d "$DB" -At -v ON_ERROR_STOP=1 \
  -c "SELECT pg_catalog.md5(pg_catalog.pg_get_functiondef('couple_private.love_stamp_challenge_pass()'::pg_catalog.regprocedure))")"
if [[ "$stamp_sha" != '3241da749bd0647c6106c613c7e3615a' ]]; then
  echo "::error::Production pass-stamp trigger definition differs from fixture"
  exit 1
fi

A="aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa"
B="bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb"
launch() {
  local label="$1" actor="$2" challenge="$3"
  (
    set +e
    psql -X -d "$DB" -At -v ON_ERROR_STOP=1 \
      -c "SET ROLE authenticated; SELECT pg_catalog.set_config('request.jwt.claim.sub','$actor',false); SELECT lr026_race.pass($challenge);" \
      > "$TMP/$label.log" 2>&1
    printf '%s\n' "$?" > "$TMP/$label.rc"
  ) &
}

status_is() {
  local label="$1" expected="$2" actual
  actual="$(cat "$TMP/$label.rc")"
  if [[ "$actual" != "$expected" ]]; then
    echo "::error::$label exit code $actual, expected $expected"
    cat "$TMP/$label.log"
    exit 1
  fi
}
assert_sql() {
  local description="$1" query="$2" expected="$3" actual
  actual="$(psql -X -d "$DB" -At -v ON_ERROR_STOP=1 -c "$query")"
  if [[ "$actual" != "$expected" ]]; then
    echo "::error::$description: found $actual, expected $expected"
    exit 1
  fi
}
reset_challenges() {
  psql -X -d "$DB" -v ON_ERROR_STOP=1 \
     -c "UPDATE lr026_race.challenges SET status='proposed',passed_at=NULL" >/dev/null
}

# Two different challenges for A arrive in parallel. Since the monthly
# cap is 1, exactly one commits and the other MUST be rejected.
launch a1 "$A" 101
launch a2 "$A" 102
wait
successes=0
failures=0
for label in a1 a2; do
  rc="$(cat "$TMP/$label.rc")"
  if [[ "$rc" == "0" ]]; then
    successes=$((successes+1))
    grep -q '"already_processed": false' "$TMP/$label.log" || {
      echo "::error::$label did not commit a real first pass"
      cat "$TMP/$label.log"; exit 1;
    }
  else
    failures=$((failures+1))
    grep -q 'Monthly pass quota reached' "$TMP/$label.log" || {
      echo "::error::$label failed for an unexpected reason"
      cat "$TMP/$label.log"; exit 1;
    }
  fi
done
if [[ "$successes" -ne 1 || "$failures" -ne 1 ]]; then
  echo "::error::Two concurrent A passes exceeded or missed the 1/month cap"
  exit 1
fi
assert_sql "Same-recipient monthly cap" \
  "SELECT count(*) FROM lr026_race.challenges WHERE recipient='$A' AND status='passed'" 1
echo "LR-026 concurrency: exactly one of two simultaneous A passes was accepted"

# Partner B retains their own quota; even when A and B hit the same
# couple lock simultaneously, both independent first passes are valid.
reset_challenges
launch partner_a "$A" 101
launch partner_b "$B" 201
wait
status_is partner_a 0
status_is partner_b 0
assert_sql "A independent monthly pass" \
 "SELECT count(*) FROM lr026_race.challenges WHERE recipient='$A' AND status='passed'" 1
assert_sql "B independent monthly pass" \
 "SELECT count(*) FROM lr026_race.challenges WHERE recipient='$B' AND status='passed'" 1
echo "LR-026 concurrency: simultaneous A/B passes respected independent quotas"

# A network retry on the SAME challenge must be idempotent rather than
# consuming a second pass. Both clients get a success; only one is new.
reset_challenges
launch retry1 "$A" 101
launch retry2 "$A" 101
wait
status_is retry1 0
status_is retry2 0
created=0
replayed=0
for label in retry1 retry2; do
  if grep -q '"already_processed": false' "$TMP/$label.log"; then
    created=$((created+1))
  elif grep -q '"already_processed": true' "$TMP/$label.log"; then
    replayed=$((replayed+1))
  else
    echo "::error::Unexpected concurrent retry response"
    cat "$TMP/$label.log"; exit 1
  fi
done
if [[ "$created" -ne 1 || "$replayed" -ne 1 ]]; then
  echo "::error::Retry was not idempotent: $created fresh, $replayed replayed"
  exit 1
fi
assert_sql "Double-click pass counted exactly once" \
 "SELECT count(*) FROM lr026_race.challenges WHERE recipient='$A' AND status='passed'" 1

# The anonymous SQL role must never execute the test SECURITY DEFINER RPC.
if psql -X -d "$DB" -v ON_ERROR_STOP=1 \
  -c "SET ROLE anon; SELECT lr026_race.pass(101)" >"$TMP/anon.log" 2>&1; then
  echo "::error::Anonymous database role invoked a protected response"
  exit 1
fi
grep -q 'permission denied' "$TMP/anon.log" || {
  echo "::error::Anonymous call failed for the wrong reason"
  cat "$TMP/anon.log"; exit 1;
}
echo "LR-026 concurrency: retry idempotent and anonymous role denied"
