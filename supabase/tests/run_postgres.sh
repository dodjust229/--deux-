#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

DB="${TEST_DB:-qspicy_test}"
if [[ ! "$DB" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
  echo "TEST_DB doit être un nom PostgreSQL simple." >&2
  exit 2
fi

if [[ -n "${PGHOST:-}" ]]; then
  PSQL=(psql -X -v ON_ERROR_STOP=1 -h "$PGHOST" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}")
  CREATEDB=(createdb -h "$PGHOST" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}")
else
  PSQL=(sudo -u postgres psql -X -v ON_ERROR_STOP=1)
  CREATEDB=(sudo -u postgres createdb)
fi

"${PSQL[@]}" -d postgres <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END
$$;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE TABLE IF NOT EXISTS storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
SQL

if ! "${PSQL[@]}" -d postgres -Atqc "SELECT 1 FROM pg_database WHERE datname = '$DB'" | grep -q 1; then
  "${CREATEDB[@]}" "$DB"
fi

"${PSQL[@]}" -d "$DB" <<'SQL'
CREATE SCHEMA IF NOT EXISTS storage;
CREATE TABLE IF NOT EXISTS storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
SQL

for migration in \
  01_schema \
  02_catalog \
  03_reconnexion_securisee \
  06_duo_schema \
  07_security_fixes \
  09_duo_replay \
  10_custom_room \
  11_game_levels \
  12_level_consent_guard \
  13_expand_balanced_catalog \
  14_session_question_history \
  15_expand_session_catalog
do
  echo "Applying supabase/${migration}.sql"
  "${PSQL[@]}" -d "$DB" -f "supabase/${migration}.sql"
done

echo "Checking level-aware catalog and RPCs"
"${PSQL[@]}" -d "$DB" <<'SQL'
DO $qspicy$
BEGIN
  IF (SELECT count(*) FROM public.catalog) <> 192 THEN
    RAISE EXCEPTION 'Expected 192 catalog cards after level migration';
  END IF;
  IF EXISTS (SELECT 1 FROM public.catalog GROUP BY level HAVING count(*) <> 48) THEN
    RAISE EXCEPTION 'Expected exactly 48 cards in each game level';
  END IF;
  IF (SELECT count(DISTINCT level) FROM public.catalog) <> 4 THEN
    RAISE EXCEPTION 'Expected all four game levels in catalog';
  END IF;
  IF to_regprocedure('public.start_game_by_level(uuid,text,integer)') IS NULL THEN
    RAISE EXCEPTION 'Missing start_game_by_level RPC';
  END IF;
  IF to_regprocedure('public.start_duo_game_by_level(uuid,text,integer)') IS NULL THEN
    RAISE EXCEPTION 'Missing start_duo_game_by_level RPC';
  END IF;
END
$qspicy$;
SQL

echo "Running level engine integration recipe"
"${PSQL[@]}" -d "$DB" -f supabase/tests/level_engine.sql

echo "Applying test-only join_room_any shim"
"${PSQL[@]}" -d "$DB" -f supabase/tests/bootstrap_custom_room.sql

echo "Running legacy custom-room integration recipe"
python3 supabase/tests/custom_room.py

echo "Applying catalog-backed custom engine"
"${PSQL[@]}" -d "$DB" -f supabase/16_custom_catalog_engine.sql

echo "Running catalog-backed custom-engine integration recipe"
python3 supabase/tests/custom_catalog_engine.py

echo "Applying Palier 4 invitation and permissions rules"
"${PSQL[@]}" -d "$DB" -f supabase/17_invitation_permissions.sql

echo "Running Palier 4 invitation and permissions integration recipe"
python3 supabase/tests/palier4_invitation_permissions.py

echo "Applying Palier 5 private gallery photo rules"
"${PSQL[@]}" -d "$DB" -f "supabase/18_room_photo_sharing.sql"

echo "Running Palier 5 private gallery photo integration recipe"
"${PSQL[@]}" -d "$DB" -f "supabase/tests/photo_sharing.sql"

echo "Running Palier 7 security and privacy regression recipe"
"${PSQL[@]}" -d "$DB" -f "supabase/tests/palier7_security_regression.sql"
