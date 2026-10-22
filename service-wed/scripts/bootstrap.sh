#!/usr/bin/env bash
# Bootstraps a fresh environment end-to-end: brings up the docker compose
# stack, runs migrations, registers the one admin account, logs in, seeds
# the wedding config, and uploads a blank (headers-only) guest list.
#
# Covers README.md's "Usage" steps 1-6; everything from step 7 on (reviewing
# the real guest list, sending campaigns, guests RSVPing, ...) is deliberate
# day-to-day use, not one-time bootstrap, so it's left out of this script.
#
# Required env vars (set in .env or export before running):
#   ADMIN_EMAIL, ADMIN_PASSWORD   -- the one admin account this app has
#   WEDDING_DATE, RSVP_DEADLINE   -- venue local time, e.g. 2030-06-15 or
#                                    2030-05-01T23:59:59 (see .env.example)
#   POSTGRES_PASSWORD             -- needed by docker-compose.yml itself
#
# Optional env vars (sensible defaults if unset):
#   RSVP_OPENS_AT, VENUE_NAME, VENUE_ADDRESS, VENUE_CITY
#   BRIDE_FNAME, GROOM_FNAME
#   REMINDER_CAP (2), REMINDER_INTERVAL_DAYS (7)
#   API_BASE_URL (http://localhost:8000)
#
# Safe to re-run: seeding the admin user updates the password hash on
# conflict, and the wedding config is a single-row upsert either way.
#
# Postgres isn't published to the host, so the migration and database steps
# run inside the containers (`docker compose exec`). Host tools needed:
# docker, curl, python3.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# ---------------------------------------------------------------------------
# 0. Preflight: required tools, required env vars, load .env
# ---------------------------------------------------------------------------
for tool in docker curl python3; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "ERROR: '$tool' is required on PATH but wasn't found." >&2
    exit 1
  fi
done

if [ -f .env ]; then
  # Not a plain `source .env`: bash would require every value containing a
  # space (e.g. VENUE_NAME=Willow Creek Barn) to be quoted in the file
  # itself, which is an easy thing to forget and a confusing "command not
  # found" error when you do. Parse it in Python instead and re-emit as
  # properly shell-quoted `export` statements.
  eval "$(python3 -c '
import shlex

with open(".env") as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'"'"'":
            value = value[1:-1]
        print(f"export {key}={shlex.quote(value)}")
')"
fi

require_var() {
  if [ -z "${!1:-}" ]; then
    echo "ERROR: \$$1 is required. Set it in .env or export it before running this script." >&2
    exit 1
  fi
}
require_var ADMIN_EMAIL
require_var ADMIN_PASSWORD
require_var WEDDING_DATE
require_var RSVP_DEADLINE
require_var POSTGRES_PASSWORD

API_BASE_URL="${API_BASE_URL:-http://localhost:8000}"
RSVP_OPENS_AT="${RSVP_OPENS_AT:-}"
VENUE_NAME="${VENUE_NAME:-}"
VENUE_ADDRESS="${VENUE_ADDRESS:-}"
VENUE_CITY="${VENUE_CITY:-}"
BRIDE_FNAME="${BRIDE_FNAME:-}"
GROOM_FNAME="${GROOM_FNAME:-}"
REMINDER_CAP="${REMINDER_CAP:-2}"
REMINDER_INTERVAL_DAYS="${REMINDER_INTERVAL_DAYS:-7}"

COOKIE_JAR="$(mktemp)"
# Works on both macOS and Linux to ensure a .csv extension
BLANK_CSV="${COOKIE_JAR}_guestlist.csv"
touch "$BLANK_CSV"
trap 'rm -f "$COOKIE_JAR" "$BLANK_CSV"' EXIT

# api_call METHOD PATH [JSON_BODY] -- prints the response body to stdout,
# exits with the response body on stderr if the status isn't 2xx. Reuses
# COOKIE_JAR for every call (both reading and writing it), so the cookie
# auth/login sets up top of this script is picked up by every call after it.
api_call() {
  local method="$1" path="$2" body="${3:-}" response status resp_body
  if [ -n "$body" ]; then
    response="$(curl -s -w '\n%{http_code}' -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
      -X "$method" "$API_BASE_URL$path" -H 'Content-Type: application/json' -d "$body")"
  else
    response="$(curl -s -w '\n%{http_code}' -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
      -X "$method" "$API_BASE_URL$path")"
  fi
  status="$(printf '%s' "$response" | tail -n1)"
  resp_body="$(printf '%s' "$response" | sed '$d')"
  if [[ ! "$status" =~ ^2 ]]; then
    echo "ERROR: $method $path failed (HTTP $status): $resp_body" >&2
    exit 1
  fi
  printf '%s' "$resp_body"
}

# ---------------------------------------------------------------------------
# 1. Start the stack
# ---------------------------------------------------------------------------
echo "==> [1/6] Starting docker compose stack..."
docker compose up -d --build

echo "    Waiting for the API to become ready..."
ready=false
for _ in $(seq 1 30); do
  if curl -sf "$API_BASE_URL/api/v1/health/ready" >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 2
done
if [ "$ready" != true ]; then
  echo "ERROR: API did not become ready within 60s. Check: docker compose logs" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# 2. Migrations
# ---------------------------------------------------------------------------
# The container already migrates on start; this repeats it (a no-op when
# up to date) so a failure shows up here, clearly.
echo "==> [2/6] Running database migrations..."
docker compose exec -T service-wed alembic upgrade head

# ---------------------------------------------------------------------------
# 3. Seed the admin account
# ---------------------------------------------------------------------------
echo "==> [3/6] Seeding admin account ($ADMIN_EMAIL)..."

# Hash with the app's own hasher, inside the API container. `-e
# ADMIN_PASSWORD` passes this shell's value, so it wins over the container's.
PASSWORD_HASH="$(docker compose exec -T -e ADMIN_PASSWORD service-wed python -c '
from service_wed.adapters.security.hasher import ScryptPasswordHasher
import os
print(ScryptPasswordHasher().hash(os.environ["ADMIN_PASSWORD"]))
')"

# psql runs in the db container. Email and hash go in as psql variables
# (:'email' quotes them safely), not pasted into the SQL text.
# ON CONFLICT ... DO UPDATE (not DO NOTHING) so re-running this script with a
# changed ADMIN_PASSWORD actually rotates it, rather than silently no-op'ing.
docker compose exec -T db sh -c \
  'psql -v ON_ERROR_STOP=1 -q -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v email="$1" -v hash="$2"' \
  _ "$ADMIN_EMAIL" "$PASSWORD_HASH" <<'SQL'
INSERT INTO admin_users (id, email, password_hash)
VALUES (gen_random_uuid(), :'email', :'hash')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;
SQL

# ---------------------------------------------------------------------------
# 4. Log in
# ---------------------------------------------------------------------------
echo "==> [4/6] Logging in as $ADMIN_EMAIL..."
LOGIN_BODY="$(python3 -c '
import json, os
print(json.dumps({"email": os.environ["ADMIN_EMAIL"], "password": os.environ["ADMIN_PASSWORD"]}))
')"
api_call POST /api/v1/auth/login "$LOGIN_BODY" >/dev/null

# ---------------------------------------------------------------------------
# 5. Seed the wedding
# ---------------------------------------------------------------------------
echo "==> [5/6] Seeding wedding configuration..."
WEDDING_BODY="$(python3 -c '
import json, os

def env_or_none(name):
    value = os.environ.get(name, "").strip()
    return value or None

print(json.dumps({
    "wedding_date": os.environ["WEDDING_DATE"],
    "rsvp_deadline": os.environ["RSVP_DEADLINE"],
    "rsvp_opens_at": env_or_none("RSVP_OPENS_AT"),
    "venue_name": env_or_none("VENUE_NAME"),
    "venue_address": env_or_none("VENUE_ADDRESS"),
    "venue_city": env_or_none("VENUE_CITY"),
    "bride_first_name": env_or_none("BRIDE_FNAME"),
    "groom_first_name": env_or_none("GROOM_FNAME"),
    "reminder_cap": int(os.environ.get("REMINDER_CAP", 2)),
    "reminder_interval_days": int(os.environ.get("REMINDER_INTERVAL_DAYS", 7)),
}))
')"
api_call PUT /api/v1/admin/wedding "$WEDDING_BODY"
echo

# ---------------------------------------------------------------------------
# 6. Upload a blank (headers-only) guest list
# ---------------------------------------------------------------------------
echo "==> [6/6] Uploading a blank guest list..."
printf 'HouseholdName,ContactEmail,GuestName,IsPlusOne\n' > "$BLANK_CSV"

IMPORT_RESPONSE="$(curl -s -w '\n%{http_code}' -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -X POST "$API_BASE_URL/api/v1/admin/households/import" \
  -F "file=@$BLANK_CSV;type=text/csv")"
IMPORT_STATUS="$(printf '%s' "$IMPORT_RESPONSE" | tail -n1)"
IMPORT_BODY="$(printf '%s' "$IMPORT_RESPONSE" | sed '$d')"
if [[ ! "$IMPORT_STATUS" =~ ^2 ]]; then
  echo "ERROR: guest list import failed (HTTP $IMPORT_STATUS): $IMPORT_BODY" >&2
  exit 1
fi
echo "$IMPORT_BODY"

echo
echo "==> Done. $ADMIN_EMAIL can log in at POST $API_BASE_URL/api/v1/auth/login."
echo "    Next: upload a real guest list (README.md step 6) and start sending campaigns (steps 7+)."
