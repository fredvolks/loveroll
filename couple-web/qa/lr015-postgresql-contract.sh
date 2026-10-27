#!/usr/bin/env bash
# LR-015 reproducible PostgreSQL transaction/permissions suite.
# ONLY an isolated, disposable local PostgreSQL 17 test database.
set -euo pipefail
if [[ "${PGHOST:-}" != "localhost" && "${PGHOST:-}" != "127.0.0.1" ]]; then
  echo "Refusing to run: PGHOST must be localhost/127.0.0.1" >&2
  exit 2
fi
if [[ "${PGDATABASE:-}" != "loveroll_lr015_test" ]]; then
  echo "Refusing to run: PGDATABASE must be loveroll_lr015_test" >&2
  exit 2
fi
cd "$(dirname "$0")/../.."
psql -X -v ON_ERROR_STOP=1 -f couple-web/qa/lr015-db-fixture.sql
psql -X -v ON_ERROR_STOP=1 -f couple-web/migrations/20261026_lr015_cycle_exclusion_registry.sql
psql -X -v ON_ERROR_STOP=1 -f couple-web/migrations/20261026_lr015_recycle_incomplete_on_close.sql
psql -X -v ON_ERROR_STOP=1 -f couple-web/migrations/20261026_lr015_z_atomic_respond_redraw.sql
psql -X -v ON_ERROR_STOP=1 -f couple-web/qa/lr015-db-contract.sql
psql -X -v ON_ERROR_STOP=1 -f couple-web/qa/lr015-restore-exclusion.sql
psql -X -v ON_ERROR_STOP=1 -f couple-web/qa/lr015-legacy-pass.sql
psql -X -v ON_ERROR_STOP=1 -f couple-web/qa/lr015-exhausted-pool.sql
psql -X -v ON_ERROR_STOP=1 -f couple-web/qa/lr015-closed-evening.sql
psql -X -v ON_ERROR_STOP=1 -f couple-web/qa/lr015-role-grants.sql
