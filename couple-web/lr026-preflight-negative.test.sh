#!/usr/bin/env bash
# Regression tests against THREE disposable PostgreSQL 17 databases.
# Never connects to or alters the production Supabase project.
set -euo pipefail

PREFLIGHT="couple-web/lr026-live-schema-preflight.sql"
BASE_DB="${PGDATABASE:?Run only against disposable GitHub LR-026 fixture}"

check_fail_closed() {
  local db="$1" output
  output="$(psql -X -d "$db" -At -F '|' -v ON_ERROR_STOP=1 -f "$PREFLIGHT")"
  if [[ "$output" != f\|* ]]; then
    echo "::error::Preflight should block this disposable state: $db"
    printf '%s\n' "$output"
    exit 1
  fi
  printf '%s' "$output"
}

expect_blocker() {
  local output="$1" blocker="$2"
  if [[ "$output" != *"$blocker"* ]]; then
    echo "::error::Missing expected LR-026 blocker: $blocker"
    printf '%s\n' "$output"
    exit 1
  fi
}

expect_no_blocker() {
  local output="$1" blocker="$2"
  if [[ "$output" == *"$blocker"* ]]; then
    echo "::error::False LR-026 blocker: $blocker"
    printf '%s\n' "$output"
    exit 1
  fi
}

# Missing functions must yield a structured denial, NOT a SQL exception.
createdb lr026_preflight_missing
output="$(check_fail_closed lr026_preflight_missing)"
expect_blocker "$output" "One or both RPCs missing"
expect_blocker "$output" "RPC source MD5 drifted"
echo "LR-026 preflight: absent functions safely block deployment"

# The already-patched isolated main fixture must not be mistaken for an
# unmodified production schema: a second migration is forbidden.
output="$(check_fail_closed "$BASE_DB")"
expect_blocker "$output" "RPC source MD5 drifted"
expect_blocker "$output" "LR-026 helpers already present"
echo "LR-026 preflight: already-migrated functions safely rejected"

# Construct a separate, unmodified synthetic source with real ACLs.
createdb lr026_preflight_mutation
psql -X -d lr026_preflight_mutation -v ON_ERROR_STOP=1 \
  -f couple-web/lr026-postgres-fixture.sql >/dev/null
psql -X -d lr026_preflight_mutation -v ON_ERROR_STOP=1 \
  -f couple-web/lr026-postgres-rpc-fixture.sql >/dev/null

output="$(check_fail_closed lr026_preflight_mutation)"
expect_blocker "$output" "RLS disabled on game tables"
expect_no_blocker "$output" "RPC ACL / SECURITY DEFINER / search_path drifted"

# Create the remaining expected public tables only in the disposable DB.
psql -X -d lr026_preflight_mutation -v ON_ERROR_STOP=1 >/dev/null <<'SQL'
CREATE TABLE public.couples (id uuid);
CREATE TABLE public.love_card_draw_history (id uuid);
CREATE TABLE public.love_cycle_excluded_cards (id uuid);
ALTER TABLE public.couple_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.love_base_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.love_card_draw_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.love_cycle_excluded_cards ENABLE ROW LEVEL SECURITY;
SQL

output="$(check_fail_closed lr026_preflight_mutation)"
expect_no_blocker "$output" "RLS disabled on game tables"
expect_no_blocker "$output" "Expected RLS tables missing"

# An RLS regression must be identified by name even if other independent
# blockers (fixture MD5, missing active view) remain present.
psql -X -d lr026_preflight_mutation -v ON_ERROR_STOP=1 \
 -c 'ALTER TABLE public.couple_challenges DISABLE ROW LEVEL SECURITY' >/dev/null
output="$(check_fail_closed lr026_preflight_mutation)"
expect_blocker "$output" "RLS disabled on game tables"
psql -X -d lr026_preflight_mutation -v ON_ERROR_STOP=1 \
 -c 'ALTER TABLE public.couple_challenges ENABLE ROW LEVEL SECURITY' >/dev/null

# SECURITY DEFINER functions must never become executable by anonymous users.
psql -X -d lr026_preflight_mutation -v ON_ERROR_STOP=1 \
 -c 'GRANT EXECUTE ON FUNCTION public.draw_for_partner(uuid,text,boolean) TO anon' >/dev/null
output="$(check_fail_closed lr026_preflight_mutation)"
expect_blocker "$output" "RPC ACL / SECURITY DEFINER / search_path drifted"
psql -X -d lr026_preflight_mutation -v ON_ERROR_STOP=1 \
 -c 'REVOKE EXECUTE ON FUNCTION public.draw_for_partner(uuid,text,boolean) FROM anon' >/dev/null
output="$(check_fail_closed lr026_preflight_mutation)"
expect_no_blocker "$output" "RPC ACL / SECURITY DEFINER / search_path drifted"

# Dropping ONLY the replacement RPC must not raise an exception.
psql -X -d lr026_preflight_mutation -v ON_ERROR_STOP=1 \
 -c 'DROP FUNCTION public.love_respond_and_redraw(uuid,text,boolean)' >/dev/null
output="$(check_fail_closed lr026_preflight_mutation)"
expect_blocker "$output" "One or both RPCs missing"
echo "LR-026 preflight: missing RPC, RLS regression and ACL escalation all detected"
