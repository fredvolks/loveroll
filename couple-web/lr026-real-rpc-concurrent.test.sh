#!/usr/bin/env bash
# LR-026 CI ONLY: call the real LoveRoll response RPC from two independent
# PostgreSQL clients, blocked simultaneously behind the actual couple lock.
# No production connection: run only inside lr026_real_rpc_test on CI.
set -euo pipefail
if [[ "${PGDATABASE:-}" != "lr026_test" ]]; then
  echo "::error::Concurrent real-RPC test requires disposable CI PGDATABASE=lr026_test"
  exit 1
fi
DB=lr026_real_rpc_test
tmp="${RUNNER_TEMP:-/tmp}/lr026-real-race-$$"
mkdir -p "$tmp"
trap 'rm -rf "$tmp"' EXIT

A=aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa
B=bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb

assert_count() {
 local label="$1" sql="$2" expected="$3" actual
 actual="$(psql -X -d "$DB" -At -v ON_ERROR_STOP=1 -c "$sql")"
 if [[ "$actual" != "$expected" ]]; then
   echo "::error::$label: expected $expected, got $actual"
   exit 1
 fi
}
launch() {
 local label="$1" actor="$2" challenge="$3"
 (
   set +e
   psql -X -d "$DB" -At -v ON_ERROR_STOP=1 \
     -c "SET statement_timeout='8s'; SET ROLE authenticated; SELECT pg_catalog.set_config('request.jwt.claim.sub','$actor',false); SELECT pg_catalog.set_config('lr026.test_verified','yes',false); SELECT public.love_respond_and_redraw('$challenge'::uuid,'pass',false);" \
     >"$tmp/$label.log" 2>&1
   printf '%s\n' "$?" >"$tmp/$label.rc"
 ) &
}

# Hold the EXACT couple row lock that the real RPC uses, then start both
# client requests before releasing. A visibility assertion proves that
# both were blocked on an actual PostgreSQL Lock rather than merely started
# close together (a strict concurrency check).
run_race() {
 local label="$1" couple="$2" actor1="$3" challenge1="$4" actor2="$5" challenge2="$6"
 local gate_pid saw1=0 saw2=0 waiting
 (
   psql -X -d "$DB" -q -At -v ON_ERROR_STOP=1 >"$tmp/$label.gate" 2>&1 <<SQL
BEGIN;
SET statement_timeout='8s';
SELECT id FROM public.couples WHERE id='$couple'::uuid FOR UPDATE;
\echo LR026_GATE_LOCKED
SELECT pg_sleep(2);
COMMIT;
SQL
 ) &
 gate_pid=$!
 for _ in $(seq 1 60); do
   if grep -q 'LR026_GATE_LOCKED' "$tmp/$label.gate" 2>/dev/null; then
     saw1=1
     break
   fi
   if ! kill -0 "$gate_pid" 2>/dev/null; then
     echo "::error::$label: gate exited before acquiring couple row lock"
     cat "$tmp/$label.gate"; exit 1
   fi
   sleep 0.05
 done
 if [[ "$saw1" != "1" ]]; then
   echo "::error::$label: couple lock gate never became ready"
   cat "$tmp/$label.gate"; exit 1
 fi
 launch "$label.1" "$actor1" "$challenge1"
 launch "$label.2" "$actor2" "$challenge2"
 # The two blocked backend sessions must overlap in time, not merely
 # produce serially correct outcomes by chance.
 for _ in $(seq 1 24); do
   waiting="$(psql -X -d "$DB" -At -v ON_ERROR_STOP=1 -c "
    SELECT count(*) FROM pg_catalog.pg_stat_activity
    WHERE datname=current_database() AND wait_event_type='Lock'
      AND query LIKE '%love_respond_and_redraw%'
      AND query NOT LIKE '%pg_stat_activity%';")"
   if [[ "$waiting" -ge 2 ]]; then saw2=1; break; fi
   sleep 0.04
 done
 if [[ "$saw2" != "1" ]]; then
   echo "::error::$label: both real RPC callers did not overlap at the couple lock"
   cat "$tmp/$label.gate" "$tmp/$label.1.log" "$tmp/$label.2.log"
   exit 1
 fi
 wait "$gate_pid"
 wait
 echo "LR-026 real RPC $label: proved two SQL calls waited on the same couple row"
}

assert_status() {
 local label="$1" expected="$2" actual
 actual="$(cat "$tmp/$label.rc")"
 if [[ "$actual" != "$expected" ]]; then
   echo "::error::$label expected exit $expected, got $actual"
   cat "$tmp/$label.log"
   exit 1
 fi
}
assert_first() {
 local label="$1"
 assert_status "$label" 0
 grep -q '"already_processed": false' "$tmp/$label.log" || {
   echo "::error::$label was not a fresh pass"; cat "$tmp/$label.log"; exit 1;
 }
}
assert_replayed() {
 local label="$1"
 assert_status "$label" 0
 grep -q '"already_processed": true' "$tmp/$label.log" || {
   echo "::error::$label was not an idempotent replay"; cat "$tmp/$label.log"; exit 1;
 }
}
assert_rejected_quota() {
 local label="$1" code
 code="$(cat "$tmp/$label.rc")"
 if [[ "$code" == 0 ]]; then
   echo "::error::$label improperly bypassed 1/month pass quota"
   cat "$tmp/$label.log"; exit 1
 fi
 grep -q 'Limite mensuelle de passes atteinte (1 / 1)' "$tmp/$label.log" || {
   echo "::error::$label failed for the wrong reason"; cat "$tmp/$label.log"; exit 1;
 }
}
assert_rows() {
 local couple="$1" passed="$2"
 assert_count "Real RPC passed rows $couple" \
 "SELECT count(*) FROM public.couple_challenges WHERE couple_id='$couple' AND status='passed' AND passed_at IS NOT NULL" "$passed"
 assert_count "Real RPC receipts $couple" \
 "SELECT count(*) FROM public.love_challenge_redraws WHERE couple_id='$couple'" "$passed"
 assert_count "Real RPC replacements $couple" \
 "SELECT count(*) FROM public.couple_challenges WHERE couple_id='$couple' AND replaces_challenge_id IS NOT NULL" "$passed"
 assert_count "Real RPC events $couple" \
 "SELECT count(*) FROM public.couple_events WHERE couple_id='$couple'" "$passed"
}

# Different cards, SAME recipient A: only one action may use the quota.
run_race quota 11111111-aaaa-4111-8111-111111111111 \
 "$A" 11111111-cccc-4111-8111-111111111111 \
 "$A" 11111111-dddd-4111-8111-111111111111
fresh=0
denied=0
for suffix in 1 2; do
 label="quota.$suffix"
 if [[ "$(cat "$tmp/$label.rc")" == 0 ]]; then
   assert_first "$label"; fresh=$((fresh+1))
 else
   assert_rejected_quota "$label"; denied=$((denied+1))
 fi
done
if [[ "$fresh" != 1 || "$denied" != 1 ]]; then
 echo "::error::Same-recipient concurrency yielded $fresh fresh and $denied rejected"
 exit 1
fi
assert_rows 11111111-aaaa-4111-8111-111111111111 1
echo "LR-026 real RPC: two different simultaneous A passes spent only one pass"

# Same couple, A and B: independent monthly quotas despite the shared lock.
run_race partners 22222222-aaaa-4222-8222-222222222222 \
 "$A" 22222222-cccc-4222-8222-222222222222 \
 "$B" 22222222-dddd-4222-8222-222222222222
assert_first partners.1
assert_first partners.2
assert_rows 22222222-aaaa-4222-8222-222222222222 2
assert_count "A independent quota" \
 "SELECT count(*) FROM public.couple_challenges WHERE couple_id='22222222-aaaa-4222-8222-222222222222' AND recipient='$A' AND status='passed'" 1
assert_count "B independent quota" \
 "SELECT count(*) FROM public.couple_challenges WHERE couple_id='22222222-aaaa-4222-8222-222222222222' AND recipient='$B' AND status='passed'" 1
echo "LR-026 real RPC: simultaneous A and B passes respected independent quotas"

# Same challenge double-click across TWO different connections.
run_race retry 33333333-aaaa-4333-8333-333333333333 \
 "$A" 33333333-cccc-4333-8333-333333333333 \
 "$A" 33333333-cccc-4333-8333-333333333333
fresh=0
replayed=0
for suffix in 1 2; do
 label="retry.$suffix"
 if grep -q '"already_processed": false' "$tmp/$label.log"; then
   assert_first "$label"; fresh=$((fresh+1))
 else
   assert_replayed "$label"; replayed=$((replayed+1))
 fi
done
if [[ "$fresh" != 1 || "$replayed" != 1 ]]; then
 echo "::error::Real RPC double click produced $fresh first, $replayed replayed"
 exit 1
fi
assert_rows 33333333-aaaa-4333-8333-333333333333 1
echo "LR-026 real RPC: duplicate simultaneous pass was idempotent"

# Anonymous callers have NO EXECUTE right on either reviewed public RPC.
if psql -X -d "$DB" -v ON_ERROR_STOP=1 \
 -c "SET ROLE anon; SELECT public.love_respond_and_redraw('33333333-cccc-4333-8333-333333333333'::uuid,'pass',false);" \
 >"$tmp/anon.log" 2>&1; then
 echo "::error::anon executed real protected response RPC"
 exit 1
fi
grep -q 'permission denied' "$tmp/anon.log" || {
 echo "::error::anon failed for an unexpected reason"; cat "$tmp/anon.log"; exit 1;
}
echo "LR-026 real RPC: anon cannot execute real protected response"
