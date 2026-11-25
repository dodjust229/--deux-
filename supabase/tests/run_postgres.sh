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
DECLARE
  v_master_ids text[] := ARRAY['d01','d02','d03','d04','d05','d06','d07','d08','d10','d11','x02','c01','c02','c03','c04','c05','c06','c07','c08','c09','c10','x01','p01','p02','p03','p04','p05','p06','p07','p08','p09','x03','s01','s02','s03','s04','s05','s06','x04','a01','a02','a03','a04','a05','a06','a07','a08','a09','a10','a11','a12','a13','a14','a15','a16','a17','a18','a19','a20','a21','a22','a23','a24','d13','d14','d15','d16','d17','d18','d20','c12','c15','c16','c17','c18','s07','p10','p11','p12','p13','p14','p15','p16','p17','s08','s09','s10','a25','a26','a28','b01','b02','b03','b04','b05','b06','b07','b08','b09','b10','b11','b12','b13','b14','b15','b16','b17','b18','b19','b20','b21','b22','b23','b24','e02','e03','e04','e06','e07','e08','e09','e10','e11','e12','e13','e14','e15','e16','e17','e18','e20','e21','e22','e23','e24','f01','f03','f04','f05','f06','f07','f08','f09','f10','f11','f12','f13','f14','f15','f16','f17','f18','f19','f20','f21','f22','f23','f24','g01','g02','g03','g04','g05','g06','g07','g08','g09','g10','g11','g12','g13','g14','g15','g17','g18','g19','g20','g21','g22','g24','n01','n02','n03','n04','n05','n06','n07','n08','n09','n10','n11','n12','n13','n14','n15','n16','n17','n18','n19','n20','n21','n22','n23','n24','n25','n26','n27','n28','n29','n30','n31','n32','n33','n34','n35','n36','n37','n38','n39','n40']::text[];
BEGIN
  IF (SELECT count(*) FROM public.catalog c WHERE c.id = ANY(v_master_ids)) <> 220 THEN
    RAISE EXCEPTION 'Catalogue V2 incomplet';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.catalog c
     WHERE NOT (c.id = ANY(v_master_ids))
       AND NOT EXISTS (
         SELECT 1 FROM public.rooms r
          WHERE r.status IN ('waiting','playing','paused')
            AND c.id = ANY(coalesce(r.interaction_ids, '{}'::text[]))
       )
  ) THEN
    RAISE EXCEPTION 'Une carte legacy non utilisée subsiste après le nettoyage';
  END IF;
  IF EXISTS (SELECT 1 FROM (VALUES (1,52),(2,53),(3,54),(4,61)) expected(level,total)
             WHERE (SELECT count(*) FROM public.catalog c WHERE c.id = ANY(v_master_ids) AND c.level=expected.level) <> expected.total) THEN
    RAISE EXCEPTION 'Répartition des niveaux techniques incorrecte';
  END IF;
  IF EXISTS (SELECT 1 FROM (VALUES (1,52),(2,53),(3,49),(4,32),(5,34)) expected(intensity,total)
             WHERE (SELECT count(*) FROM public.catalog c WHERE c.id = ANY(v_master_ids) AND c.intensity=expected.intensity) <> expected.total) THEN
    RAISE EXCEPTION 'Répartition des intensités éditoriales incorrecte';
  END IF;
  IF EXISTS (SELECT 1 FROM public.catalog c WHERE c.id = ANY(v_master_ids)
             AND (c.intensity NOT BETWEEN 1 AND 5 OR c.explicit_rank <> least(4,c.intensity))) THEN
    RAISE EXCEPTION 'Intensité ou explicite incohérent';
  END IF;
END
$catalogue$;
SQL

echo "Applying QCM options snapshot fix after the catalogue V2"
"${PSQL[@]}" -d "$DB" -f "supabase/24_qcm_options_from_server.sql"

echo "Running QCM options synchronization recipe"
"${PSQL[@]}" -d "$DB" -f "supabase/tests/qcm_options_from_server.sql"

# Re-run the multi-interest custom flow after migration 21, which replaces start_custom_game.
"${PSQL[@]}" -d "$DB" -c "TRUNCATE public.rate_events"
echo "Rechecking Couple, DUOS and custom union-of-interests after all migrations"
python3 supabase/tests/palier4_invitation_permissions.py

# Vérifie que la migration 25 rétablit le helper même si une base intermédiaire l’a perdu.
"${PSQL[@]}" -d "$DB" -c "DROP FUNCTION IF EXISTS public._pick_catalog_deck(text[],integer,text[])"

echo "Applying QSPICY audit correction 25"
"${PSQL[@]}" -d "$DB" -f "supabase/25_audacieux_floor_and_deck.sql"

echo "Running post-migration audit regression recipe"
"${PSQL[@]}" -d "$DB" -f "supabase/tests/audit_regressions.sql"

echo "Rechecking invitation and multi-interest flows after migration 25"
"${PSQL[@]}" -d "$DB" -c "TRUNCATE public.rate_events"
python3 supabase/tests/palier4_invitation_permissions.py
