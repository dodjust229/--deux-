#!/usr/bin/env bash
# Recette d'invitation du mode Personnalisé sur une base Supabase de test.
#
# Ce que ce harnais monte, sans toucher à la production :
#   1. une base PostgreSQL jetable construite à partir des migrations du dépôt ;
#   2. un serveur PostgREST devant cette base (l'API /rest/v1 que le front appelle) ;
#   3. le front compilé branché sur cette base de test ;
#   4. deux navigateurs : l'hôte ouvre un salon Personnalisé, l'invité entre par le lien seul.
#
# Prérequis : PostgreSQL 16 local ou service local via PGHOST, node/npm, Chrome/Chromium, curl, python3.
# Usage : bash supabase/tests/invite_e2e/run.sh
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
cd "$ROOT"

DB="${TEST_DB:-qspicy_invite_e2e}"
PGRST_PORT="${PGRST_PORT:-3199}"
APP_PORT="${APP_PORT:-5299}"
CACHE="${PGREST_CACHE:-/tmp/qspicy-invite-e2e}"
JWT_SECRET="invite-e2e-secret-0123456789abcdef"
OUT="${BUILD_OUT:-/tmp/qspicy-invite-dist}"

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

mkdir -p "$CACHE"
if [[ -n "${PGHOST:-}" ]]; then
  PSQL=(psql -X -q -v ON_ERROR_STOP=1 -h "$PGHOST" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}")
  CREATEDB=(createdb -h "$PGHOST" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}")
  DROPDB=(dropdb -h "$PGHOST" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}")
else
  PSQL=(sudo -u postgres psql -X -q -v ON_ERROR_STOP=1)
  CREATEDB=(sudo -u postgres createdb)
  DROPDB=(sudo -u postgres dropdb)
fi

cleanup() {
  [[ -n "${PGRST_PID:-}" ]] && kill "$PGRST_PID" 2>/dev/null || true
  [[ -n "${SERVER_PID:-}" ]] && kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

# ---------- 1. PostgREST ----------
if [[ ! -x "$CACHE/postgrest" ]]; then
  echo "→ téléchargement de PostgREST 16.6"
  curl -sL -o "$CACHE/postgrest.tar.xz" \
    https://github.com/PostgREST/postgrest/releases/download/v16.6/postgrest-v16.6-linux-static-x86-64.tar.xz
  tar -xJf "$CACHE/postgrest.tar.xz" -C "$CACHE" postgrest
fi

# ---------- 2. Base jetable ----------
echo "→ base $DB"
"${PSQL[@]}" -d postgres <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticator') THEN
    CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD 'invite';
  ELSE
    ALTER ROLE authenticator LOGIN NOINHERIT PASSWORD 'invite';
  END IF;
END $$;
GRANT anon TO authenticator;
SQL
"${DROPDB[@]}" --if-exists "$DB"
"${CREATEDB[@]}" "$DB"
"${PSQL[@]}" -d "$DB" <<'SQL'
CREATE SCHEMA IF NOT EXISTS storage;
CREATE TABLE IF NOT EXISTS storage.buckets (
  id text primary key, name text not null, public boolean not null default false,
  file_size_limit bigint, allowed_mime_types text[]
);
SQL

# Même ordre que supabase/tests/run_postgres.sh.
for migration in \
  01_schema 02_catalog 03_reconnexion_securisee 06_duo_schema 07_security_fixes \
  09_duo_replay 10_custom_room 11_game_levels 12_level_consent_guard \
  13_expand_balanced_catalog 14_session_question_history 15_expand_session_catalog \
  16_custom_catalog_engine 17_invitation_permissions 18_room_photo_sharing \
  19_invitation_finalisation 20_level_and_mode_integrity 21_explicit_content_floor
do
  echo "   migration $migration"
  "${PSQL[@]}" -d "$DB" -f "supabase/$migration.sql" >/dev/null
done

# Aucun adaptateur de test : `join_room_any` est versionné par 19_invitation_finalisation.sql.
# La base de recette est donc exactement celle que produirait le dépôt seul.
# La limitation de débit par client bloquerait une rafale de créations de test.
"${PSQL[@]}" -d "$DB" -c "truncate public.rate_events" >/dev/null

# ---------- 3. PostgREST ----------
ANON_JWT="$(python3 - "$JWT_SECRET" <<'PY'
import hmac, hashlib, base64, json, sys, time
secret = sys.argv[1].encode()
b64 = lambda b: base64.urlsafe_b64encode(b).decode().rstrip("=")
head = b64(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
body = b64(json.dumps({"role": "anon", "exp": int(time.time()) + 86400 * 30}, separators=(",", ":")).encode())
sig = b64(hmac.new(secret, f"{head}.{body}".encode(), hashlib.sha256).digest())
print(f"{head}.{body}.{sig}")
PY
)"
sed -e "s|__DB__|$DB|" -e "s|__PORT__|$PGRST_PORT|" -e "s|__SECRET__|$JWT_SECRET|" \
  "$HERE/pgrst.conf.tpl" > "$CACHE/pgrst.conf"
"$CACHE/postgrest" "$CACHE/pgrst.conf" > "$CACHE/postgrest.log" 2>&1 &
PGRST_PID=$!
for _ in $(seq 1 40); do
  curl -sf "http://127.0.0.1:$PGRST_PORT/" >/dev/null 2>&1 && break
  sleep 0.25
done

# ---------- 4. Front branché sur la base de test ----------
echo "→ compilation du front (base $PGRST_PORT)"
printf 'VITE_SUPABASE_URL=http://127.0.0.1:%s\nVITE_SUPABASE_ANON_KEY=%s\n' "$APP_PORT" "$ANON_JWT" > .env.invite-e2e
npx tsc -b >/dev/null
npx vite build --mode invite-e2e --outDir "$OUT" --emptyOutDir >/dev/null
rm -f .env.invite-e2e

PORT=$APP_PORT PGRST_PORT=$PGRST_PORT STATIC_DIR=$OUT node "$HERE/server.mjs" > "$CACHE/server.log" 2>&1 &
SERVER_PID=$!
for _ in $(seq 1 40); do
  curl -sf "http://127.0.0.1:$APP_PORT/" >/dev/null 2>&1 && break
  sleep 0.25
done

# ---------- 5. Recette navigateur ----------
if [[ ! -d "$HERE/node_modules/puppeteer-core" ]]; then
  echo "→ installation de puppeteer-core (une fois)"
  npm install --prefix "$HERE" --no-audit --no-fund >/dev/null
fi
echo "→ recette d'invitation (Personnalisé)"
BASE_URL="http://127.0.0.1:$APP_PORT/" node "$HERE/invite.spec.mjs"
echo "→ recette d'invitation (DUOS et lien tronqué)"
BASE_URL="http://127.0.0.1:$APP_PORT/" node "$HERE/invite_duos.spec.mjs"
