#!/usr/bin/env bash
# CI ONLY. Real PostgreSQL RLS with synthetic A/B/C identities, no hosted DB.
set -euo pipefail
if [[ "$PGDATABASE" != "lr026_test" ]]; then
  echo "::error::Staging RLS tests require disposable PGDATABASE=lr026_test"
  exit 1
fi
DB="lr026_rls_test"
createdb "$DB"
psql -X -d "$DB" -v ON_ERROR_STOP=1 \
 -f couple-web/lr026-real-rpc-schema.sql >/dev/null
psql -X -d "$DB" -v ON_ERROR_STOP=1 \
 -f couple-web/lr026-real-rpc-snapshot.sql >/dev/null
psql -X -d "$DB" -v ON_ERROR_STOP=1 >/dev/null <<'SQL'
REVOKE ALL ON FUNCTION public.draw_for_partner(uuid,text,boolean)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.love_respond_and_redraw(uuid,text,boolean)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.draw_for_partner(uuid,text,boolean)
 TO authenticated;
GRANT EXECUTE ON FUNCTION public.love_respond_and_redraw(uuid,text,boolean)
 TO authenticated;
SQL
# Never run migrations on Supabase! The DB was CREATED above in local CI.
psql -X -d "$DB" -v ON_ERROR_STOP=1 \
 -f couple-web/lr026-server-variety.sql >/dev/null
psql -X -d "$DB" -v ON_ERROR_STOP=1 \
 -f couple-web/lr026-staging-rls-fixture.sql >/dev/null

readiness="$(psql -X -d "$DB" -At -v ON_ERROR_STOP=1 \
 -f couple-web/lr026-staging-readiness.sql)"
if [[ "$readiness" != "PASS|0|" ]]; then
  echo "::error::Healthy RLS staging readiness should pass: $readiness"
  exit 1
fi
psql -X -d "$DB" -v ON_ERROR_STOP=1 \
 -f couple-web/lr026-staging-rls.test.sql
echo "LR-026 staging readiness: real PostgreSQL A/B/C RLS and private-card isolation passed"

check_rejected() {
  local label="$1" expected="$2" sql="$3" out
  # Changes are always rolled back and exist only for one connection.
  out="$(psql -X -d "$DB" -At -v ON_ERROR_STOP=1 <<SQL
BEGIN;
$sql
\i couple-web/lr026-staging-readiness.sql
ROLLBACK;
SQL
)"
  if [[ "$out" != *"FAIL|"* || "$out" != *"$expected"* ]]; then
    echo "::error::RLS staging readiness failed to reject $label: $out"
    exit 1
  fi
  echo "LR-026 preflight correctly blocked: $label"
}
check_rejected "disabled RLS" "RLS_ENABLED:couple_members" \
 "ALTER TABLE public.couple_members DISABLE ROW LEVEL SECURITY;"
check_rejected "anonymous SELECT" "ROLE_GRANTS:couple_challenges" \
 "GRANT SELECT ON public.couple_challenges TO anon;"
check_rejected "permissive identity gate" "VERIFIED_IDENTITY_RESTRICTIVE:couple_sessions" \
 "DROP POLICY loveroll_confirmed_email_required ON public.couple_sessions;
  CREATE POLICY loveroll_confirmed_email_required
  ON public.couple_sessions FOR ALL TO authenticated USING (true);"
check_rejected "additional permissive read bypass" "NO_EXTRA_PERMISSIVE_READ:couple_sessions" \
 "CREATE POLICY lr026_unsafe_read ON public.couple_sessions
  FOR SELECT TO authenticated USING (true);"
echo "LR-026 RLS staging readiness rejects four dangerous security drifts"
