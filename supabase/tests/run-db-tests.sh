#!/bin/bash
# Runs database function tests against local Supabase
# Requires: supabase start (local dev stack running)
set -e

DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
TESTS_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Running database function tests..."
psql "$DB_URL" -f "$TESTS_DIR/setup.sql"
psql "$DB_URL" -f "$TESTS_DIR/test_move_pipeline_stage.sql"
psql "$DB_URL" -f "$TESTS_DIR/test_exclude_artist.sql"
psql "$DB_URL" -f "$TESTS_DIR/test_is_excluded.sql"
psql "$DB_URL" -f "$TESTS_DIR/test_dashboard_stats.sql"
psql "$DB_URL" -f "$TESTS_DIR/teardown.sql"
echo "All database tests passed!"
