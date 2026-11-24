#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

DB="${TEST_DB:-qspicy_test}"
if [[ ! "$DB" =~ ^(qspicy_test|qspicy_invite_e2e)(_[A-Za-z0-9_]+)?$ ]]; then
  echo "TEST_DB doit utiliser le préfixe réservé qspicy_test ou qspicy_invite_e2e." >&2
  exit 2
fi
for host in "${PGHOST:-}" "${PGHOSTADDR:-}"; do
  if [[ -n "$host" && "$host" != "localhost" && "$host" != "127.0.0.1" && "$host" != "::1" ]]; then
    echo "Connexion PostgreSQL distante interdite pour cette recette (hôte: $host)." >&2
    exit 2
  fi
done
if [[ -n "${PGSERVICE:-}" || -n "${PGSERVICEFILE:-}" ]]; then
  echo "Les profils PG service sont interdits pour éviter une cible de base inattendue." >&2
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

# Base recréée à chaque exécution : les recettes doivent tourner sur une base construite
# uniquement à partir des migrations du dépôt, jamais sur un état laissé par un run précédent.
"${PSQL[@]}" -d postgres -c "DROP DATABASE IF EXISTS \"$DB\" WITH (FORCE);" >/dev/null
"${CREATEDB[@]}" "$DB"

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
  -- Les migrations historiques 13 et 15 peuvent réintroduire des cartes retirées ;
  -- le catalogue final est vérifié après la migration 22.
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

echo "Applying catalog-backed custom engine"
"${PSQL[@]}" -d "$DB" -f supabase/16_custom_catalog_engine.sql

echo "Applying Palier 4 invitation and permissions rules"
"${PSQL[@]}" -d "$DB" -f supabase/17_invitation_permissions.sql

echo "Applying Palier 5 private gallery photo rules"
"${PSQL[@]}" -d "$DB" -f "supabase/18_room_photo_sharing.sql"

# Simule une ancienne salle Personnalisé créée avant l'existence de room_kind.
"${PSQL[@]}" -d "$DB" <<'SQL'
INSERT INTO public.rooms (id, mode, status, custom_deck, interaction_ids)
VALUES ('00000000-0000-4000-8000-000000000019', 'couple', 'waiting',
        '["Question personnalisée legacy"]'::jsonb, ARRAY['perso-1']);
SQL

echo "Applying invitation finalisation (after 16, 17 and 18)"
"${PSQL[@]}" -d "$DB" -f "supabase/19_invitation_finalisation.sql"

# Isolate rate-limit counters between independent integration recipes.
"${PSQL[@]}" -d "$DB" -c "TRUNCATE public.rate_events"

echo "Running catalog-backed custom-engine integration recipe"
python3 supabase/tests/custom_catalog_engine.py

# The pre-catalog custom_room.py exercises the retired JSONB RPC signature.
# The canonical catalog engine and invitation recipes below cover the supported flow.


# La migration doit reconnaître le deck historique et le préserver en Personnalisé.
"${PSQL[@]}" -d "$DB" <<'SQL'
DO $legacy$
BEGIN
  IF (SELECT room_kind FROM public.rooms
       WHERE id = '00000000-0000-4000-8000-000000000019') IS DISTINCT FROM 'custom' THEN
    RAISE EXCEPTION 'La migration 19 a mal classé une ancienne salle Personnalisé';
  END IF;
END
$legacy$;
DELETE FROM public.rooms WHERE id = '00000000-0000-4000-8000-000000000019';
SQL

# Isolate rate-limit counters between independent integration recipes.
"${PSQL[@]}" -d "$DB" -c "TRUNCATE public.rate_events"

echo "Running Palier 4 invitation and permissions integration recipe"
python3 supabase/tests/palier4_invitation_permissions.py

echo "Applying level and mode integrity fix (after 19)"
"${PSQL[@]}" -d "$DB" -f supabase/20_level_and_mode_integrity.sql

echo "Re-running level engine recipe against the final schema"
"${PSQL[@]}" -d "$DB" -f supabase/tests/level_engine.sql


echo "Running Palier 5 private gallery photo integration recipe"
"${PSQL[@]}" -d "$DB" -f "supabase/tests/photo_sharing.sql"

echo "Running Palier 7 security and privacy regression recipe"
"${PSQL[@]}" -d "$DB" -f "supabase/tests/palier7_security_regression.sql"

# Isolate rate-limit counters between independent integration recipes.
"${PSQL[@]}" -d "$DB" -c "TRUNCATE public.rate_events"

echo "Running invitation permissions and dispatcher recipe"
"${PSQL[@]}" -d "$DB" -f "supabase/tests/invitation_permissions.sql"

echo "Running level and mode integrity recipe"
"${PSQL[@]}" -d "$DB" -f "supabase/tests/level_and_mode_integrity.sql"

echo "Applying explicit content floor fix (must run after 20)"
"${PSQL[@]}" -d "$DB" -f "supabase/21_explicit_content_floor.sql"

echo "Running explicit content floor recipe"
"${PSQL[@]}" -d "$DB" -f "supabase/tests/explicit_content_floor.sql"

echo "Replacing active catalogue with the 220-card master V2"
"${PSQL[@]}" -d "$DB" -f "supabase/22_catalogue_maitre_v2.sql"
"${PSQL[@]}" -d "$DB" <<'SQL'
DO $catalogue$
BEGIN
  IF (SELECT count(*) FROM public.catalog) <> 220 THEN
    RAISE EXCEPTION 'Catalogue V2 incomplet';
  END IF;
  IF EXISTS (SELECT 1 FROM (VALUES (1,52),(2,53),(3,54),(4,61)) expected(level,total)
             WHERE (SELECT count(*) FROM public.catalog c WHERE c.level=expected.level) <> expected.total) THEN
    RAISE EXCEPTION 'Répartition des niveaux techniques incorrecte';
  END IF;
  IF EXISTS (SELECT 1 FROM (VALUES (1,52),(2,53),(3,49),(4,32),(5,34)) expected(intensity,total)
             WHERE (SELECT count(*) FROM public.catalog c WHERE c.intensity=expected.intensity) <> expected.total) THEN
    RAISE EXCEPTION 'Répartition des intensités éditoriales incorrecte';
  END IF;
  IF EXISTS (SELECT 1 FROM public.catalog WHERE intensity NOT BETWEEN 1 AND 5 OR explicit_rank <> least(4,intensity)) THEN
    RAISE EXCEPTION 'Intensité ou explicite incohérent';
  END IF;
END
$catalogue$;
SQL

# Re-run the multi-interest custom flow after migration 21, which replaces start_custom_game.
"${PSQL[@]}" -d "$DB" -c "TRUNCATE public.rate_events"
echo "Rechecking Couple, DUOS and custom union-of-interests after all migrations"
python3 supabase/tests/palier4_invitation_permissions.py
