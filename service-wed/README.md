# service-wed

Backend API for a wedding website: guest RSVPs, magic-link invitations, admin-run
email campaigns (save-the-date, RSVP invites, reminders, final details, thank
you), and delivery tracking via Resend webhooks.

Built with FastAPI + SQLAlchemy (async) + PostgreSQL + Redis/arq, following a
lightweight hexagonal layout (`controllers/` → `services/` → `ports/` +
`adapters/`). This app is designed for **one wedding, one admin account** (the
couple) — there's no multi-tenant or self-service registration model.

This README covers the backend on its own, using **this directory's**
`docker-compose.yml`: Postgres, Redis, the API on `http://localhost:8000` and
the worker. In production the same image runs behind Traefik on one origin
with the frontend. See the [root README](../README.md) and
[deploy/README.md](../deploy/README.md).

---

## Table of contents

- [Architecture at a glance](#architecture-at-a-glance)
- [Prerequisites](#prerequisites)
- [Configuration](#configuration)
- [Usage: end-to-end walkthrough](#usage-end-to-end-walkthrough)
  1. [Start the stack](#1-start-the-stack)
  2. [Run migrations](#2-run-migrations)
  3. [Seed the admin account](#3-seed-the-admin-account)
  4. [Log in](#4-log-in)
  5. [Create the wedding](#5-create-the-wedding)
  6. [Build and upload the guest list](#6-build-and-upload-the-guest-list)
  7. [Review the guest list](#7-review-the-guest-list)
  8. [Send a Save the Date campaign](#8-send-a-save-the-date-campaign)
  9. [Send an RSVP Invite campaign](#9-send-an-rsvp-invite-campaign)
  10. [Guests respond](#10-guests-respond)
  11. [Reminders (automatic)](#11-reminders-automatic)
  12. [Final Details campaign](#12-final-details-campaign)
  13. [Thank You campaign (post-wedding)](#13-thank-you-campaign-post-wedding)
  14. [Dashboard and exports](#14-dashboard-and-exports)
  15. [Logging out / rotating the admin session](#15-logging-out--rotating-the-admin-session)
  16. [Tearing down](#16-tearing-down)
- [Testing](#testing)
- [Integrating with a React + Vite + Node.js frontend](#integrating-with-a-react--vite--nodejs-frontend)
- [API reference](#api-reference)
- [Known limitations](#known-limitations)

---

## Architecture at a glance

```
controllers/v1/*.py   FastAPI routers -- parse request, call a service, serialize response
services/*.py         Use cases; own transaction boundaries via UnitOfWorkPort
ports/                Protocols the services depend on (repositories, email sender,
                       password hasher, queue) -- no SQLAlchemy/FastAPI/arq imports
adapters/             Concrete implementations of those ports (SQLAlchemy repos,
                       Resend/console email senders, scrypt hasher, arq queue)
models/                SQLAlchemy ORM models
schemas/               Pydantic request/response DTOs
domain/errors.py       DomainError hierarchy -> {"error": {"code", "message"}} envelope
tasks/ + worker.py     arq background jobs (dispatch, send, reminders) run by a
                       separate `worker` process/container, not the API process
```

Every service call builds a **fresh `UnitOfWork`** (one DB session, one
transaction) per call — see `bootstrap.py`'s module docstring if you're
extending this; don't reuse a `UnitOfWork`/service instance across requests or
concurrent arq jobs.

---

## Prerequisites

- Docker + Docker Compose
- [`uv`](https://docs.astral.sh/uv/) (for running Alembic migrations and any
  one-off scripts from the host)
- `psql` (optional, but very useful for inspecting the database directly)
- Python 3.12 (only needed if you want to run things outside Docker; `uv`
  will manage this for you via `uv run`)

---

## Configuration

`.env` (this directory) feeds `docker-compose.yml`, which sets the
environment for the containers themselves (`db`, `service-wed`, `worker`).
Inside the Docker network they talk to Postgres/Redis by service name (`db`,
`redis`), not `localhost` — and `db`/`redis` aren't published to the host at
all (only `service-wed`'s API port, `8000`, is), so anything you run
*from the host* (Alembic, one-off admin-seeding scripts) can't reach
Postgres/Redis directly. See [step 2](#2-run-migrations)/[step
3](#3-seed-the-admin-account) below for the one-off-container workaround.

| Variable | Default | Used by | Notes |
|---|---|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `wedding_db_user` / *(required)* / `wedding_db` | `db`, composed into `DATABASE_URL` for API/worker | `POSTGRES_PASSWORD` has no default — `docker-compose.yml` fails loudly if unset. Don't reuse `wedding_db_pw` |
| `DATABASE_URL` | built by compose from the `POSTGRES_*` values | API, worker | Not set in `.env`; compose builds it, pointing at `db:5432` inside the Docker network |
| `REDIS_URL` | `redis://redis:6379` | API, worker | Shared by the arq queue *and* the rate limiter |
| `DEBUG` | `false` | API | See [cookie note](#cookie-based-auth) below — controls the admin session cookie's `Secure` flag and SQL echo logging |
| `RESEND_API_KEY` | unset | worker | If unset, emails are printed to the worker's logs via a console sender instead of actually sent. Every email goes through the worker; the API only queues them |
| `RESEND_FROM_ADDRESS` | `wedding@example.com` | worker | From-address used when `RESEND_API_KEY` is set |
| `RESEND_MAX_SENDS_PER_SECOND` | `2` | worker | How fast the worker calls Resend. Keep at or below your Resend account's rate limit, or bulk campaigns hit `429`s (those are retried, but slower) |
| `RESEND_WEBHOOK_SECRET` | unset | API | Resend/Svix webhook signing secret. If unset, `/webhooks/resend` rejects every call (`503`), except with `DEBUG=true`, where it accepts them **unverified** (local dev only). In Resend, subscribe the webhook to `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`, `email.failed` and `email.suppressed`; the last four mark the message `failed` |
| `PUBLIC_SITE_URL` | `http://localhost:5173` | API, worker | Where the frontend lives; used to build the `{{ rsvp_url }}` link in emails. Must be the real `https://` domain in production |
| `SESSION_COOKIE_NAME` | `admin_session` | API | |
| `CORS_ALLOW_ORIGINS` | `http://localhost:3000,http://localhost:5173` | API | Comma-separated list of allowed frontend origins. Not needed in production, where the frontend and API share one origin |
| `CLIENT_IP_HEADER` | unset | API | Header holding the real visitor IP, used for per-visitor rate limits. Production sets `CF-Connecting-IP` (Cloudflare). Leave unset when nothing trusted sets it, or a client could fake its IP |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | unset | API (first boot) | Seed the one admin account if none exists yet (see note below) |
| `WEDDING_DATE` / `RSVP_DEADLINE` / `RSVP_OPENS_AT` | unset | API (first boot) | Seed the wedding config. **venue local time**, e.g. `2030-06-15` or `2030-05-01T23:59:59`; a value with `Z` or an offset is taken as that exact instant |
| `VENUE_NAME` / `VENUE_ADDRESS` / `VENUE_CITY` / `BRIDE_FNAME` / `GROOM_FNAME` | unset | API (first boot) | Optional wedding config fields |
| `REMINDER_CAP` / `REMINDER_INTERVAL_DAYS` | `2` / `7` | API (first boot) | Automatic reminder limits (see [step 11](#11-reminders-automatic)) |

---

## Usage: end-to-end walkthrough

Everything below uses `curl` against `http://localhost:8000`. If you're
testing a deployed instance instead of local Docker, swap in your real
domain/HTTPS — and see the [cookie note](#cookie-based-auth) about `DEBUG`
before you do.

> **Steps 2, 3, and 5 already happen automatically.** `docker-compose.yml`'s
> `service-wed` container runs `alembic upgrade head` and then
> `python -m service_wed.scripts.container_bootstrap` before it starts
> uvicorn — that script seeds the admin account and the wedding config from
> `.env`'s `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`WEDDING_DATE`/`RSVP_DEADLINE` (and
> the optional wedding fields), but only if they don't already exist, so
> it's safe on every restart. Set those in `.env` before `docker compose up`
> and you can skip straight to [step 6](#6-build-and-upload-the-guest-list).
> [`scripts/bootstrap.sh`](scripts/bootstrap.sh) automates steps 1–6
> (including uploading a blank guest list). Unlike the first-boot seeding,
> it re-applies `.env`'s admin password and wedding values on every run, so
> use it to push `.env` changes to an existing stack. It needs only
> `docker`, `curl` and `python3` on the host; the database steps run inside
> the containers. Read steps 1–6 anyway if
> you want to understand what's happening, need to do any of it by hand
> (e.g. against a deployed instance without shell access), or want to
> re-seed something after editing `.env` on an already-running stack (the
> "only if it doesn't already exist" guard means you can't just restart —
> see each step below for the manual alternative).

### 1. Start the stack

```bash
docker compose up -d --build
docker compose ps
```

This starts four containers:

| Service | Container name | Purpose |
|---|---|---|
| `db` | `wedding_db` | PostgreSQL 18 |
| `redis` | `wedding_redis` | Redis 8 — arq job queue + rate-limit counters |
| `service-wed` | `service-wed` | The FastAPI app, port `8000` |
| `worker` | `service-wed-worker` | arq worker — **without this, no campaign or reminder email is ever actually sent**, they just sit as `scheduled` forever |

Confirm it's healthy:

```bash
curl -s http://localhost:8000/api/v1/health/live    # {"status":"ok"} -- process is up
curl -s http://localhost:8000/api/v1/health/ready   # {"status":"ok"} -- DB is reachable
curl -s http://localhost:8000/api/v1/health/worker  # {"status":"ok"} -- the worker is running
```

### 2. Run migrations

Already done automatically by `service-wed`'s container command on every
start (safe to re-run — already-applied revisions are skipped). Manual runs
are only for development, e.g. generating a new migration file. `db`/`redis`
aren't published to the host by this `docker-compose.yml` (only `service-wed`'s
API port is), so host-run Alembic can't reach `db:5432` directly — run it
from a one-off container attached to the same Docker network instead:

```bash
docker run --rm \
  --network service-wed_default \
  -e DATABASE_URL="postgresql+asyncpg://$POSTGRES_USER:$POSTGRES_PASSWORD@db:5432/$POSTGRES_DB" \
  -v "$(pwd)/src:/app/src:ro" \
  -v "$(pwd)/alembic:/app/alembic:ro" \
  -v "$(pwd)/alembic.ini:/app/alembic.ini:ro" \
  --entrypoint /app/.venv/bin/alembic \
  service-wed-service-wed:latest revision --autogenerate -m "describe your change"
```

(Swap `revision --autogenerate` for `upgrade head` to just apply migrations
by hand instead of writing a new one. `service-wed_default` is Compose's
default network name for this directory — confirm with `docker network ls`
if you've renamed the project.)

### 3. Seed the admin account

Already done automatically if `ADMIN_EMAIL`/`ADMIN_PASSWORD` are set in
`.env` before `docker compose up` (see the note above step 1) — but only the
first time, since `container_bootstrap.py` skips this once an admin account
exists, so it won't rotate a password you change in `.env` later. To do it
manually instead (first time), or to rotate a password on an already-running
stack:

There is **no self-service registration** — the couple is the one and only
admin account, and it's created directly in the database. Generate a
password hash with the app's own hasher:

```bash
uv run python -c "
from service_wed.adapters.security.hasher import ScryptPasswordHasher
print(ScryptPasswordHasher().hash('choose-a-real-password-here'))
"
```

This prints something like:
`scrypt$16384$8$1$<salt_hex>$<hash_hex>`

Copy that **entire string, including the `scrypt$` prefix** — nothing gets
trimmed or reformatted, `verify()` expects it back exactly as printed.

Insert the admin row. Write it to a `.sql` file rather than passing it on the
`psql -c` command line — the hash contains bare `$` characters that bash will
try to expand inside double quotes. `db`/`redis` aren't published to the host
by this `docker-compose.yml`, so run `psql` inside the `wedding_db` container
instead of from the host:

```bash
cat > seed_admin.sql <<'EOF'
INSERT INTO admin_users (id, email, password_hash)
VALUES (gen_random_uuid(), 'you@example.com', 'PASTE_YOUR_FULL_HASH_HERE');
EOF
docker cp seed_admin.sql wedding_db:/tmp/seed_admin.sql
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" wedding_db \
  psql -U "${POSTGRES_USER:-wedding_db_user}" -d "${POSTGRES_DB:-wedding_db}" -f /tmp/seed_admin.sql
rm seed_admin.sql
```

### 4. Log in

```bash
curl -s -c cookies.txt -X POST http://localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"choose-a-real-password-here"}'
```

`-c cookies.txt` saves the `admin_session` cookie the API sets on success;
every admin request below reuses it with `-b cookies.txt`. There is no
bearer token — the raw session token only ever lives in this httponly
cookie.

### 5. Create the wedding

There's exactly one wedding config row. `PUT` always upserts it — call it
once now, and again any time you need to change the date, venue, or RSVP
window:

```bash
curl -s -b cookies.txt -X PUT http://localhost:8000/api/v1/admin/wedding \
  -H 'Content-Type: application/json' \
  -d '{
    "wedding_date": "2027-06-12T18:00:00Z",
    "rsvp_deadline": "2027-05-01T00:00:00Z",
    "rsvp_opens_at": "2026-08-01T00:00:00Z",
    "venue_name": "Willow Creek Barn",
    "venue_address": "123 Countryside Rd, Nowhere, USA",
    "venue_city": "Nowhere",
    "bride_first_name": "Jane",
    "groom_first_name": "John",
    "reminder_cap": 2,
    "reminder_interval_days": 7
  }'
```

Notes:
- `wedding_date` and `rsvp_deadline` are required; `rsvp_deadline` must not
  be after `wedding_date`, and `rsvp_opens_at` (optional) must be before
  `rsvp_deadline` — both are validated and return `422` if violated.
- Datetimes **without** a `Z`/offset are read as venue local time,
  e.g. `"2030-05-01T23:59:59"` is the end of May 1 at the venue
  (`config/venue.py`). With `Z` or an offset, they're exact instants. Everything
  is stored in UTC.
- `venue_*`, `bride_first_name` and `groom_first_name` are optional.
- `reminder_cap`/`reminder_interval_days` control the automatic reminder
  cron (see [step 11](#11-reminders-automatic)); they default to `2` and `7`
  if omitted.
- Guests can't submit RSVPs until `now >= rsvp_opens_at` (if you set one) and
  before `rsvp_deadline` — see [step 10](#10-guests-respond).

The public frontend reads the same data with no auth required:

```bash
curl -s http://localhost:8000/api/v1/wedding
```

This intentionally omits `reminder_cap`/`reminder_interval_days` — those are
internal delivery-tuning knobs, not something a guest needs. It 404s with a
`not_found` error until you've run the `PUT` above at least once.

### 6. Build and upload the guest list

The CSV needs exactly these headers:

```csv
HouseholdName,ContactEmail,GuestName,IsPlusOne
The Bartons,bartons@example.com,Alice Barton,false
The Bartons,,Bob Barton,false
,,Solo Sam,false
,grandma@example.com,Grandma Betty,false
```

Row rules (`services/guest_list.py`):

- **`GuestName` is always required.** There's no fallback — a blank one is a
  hard error and rejects that row.
- **`HouseholdName` may be blank.** A guest with no household given becomes
  their own one-person household, named after themselves.
- **`ContactEmail` may be blank.** Households are matched/merged **by name**,
  not only by email — a guest whose row has no email still lands in the
  same household as an earlier row with the same `HouseholdName`, and
  inherits that household's email once one exists for it (the example
  above: Bob Barton has no email of his own but ends up sharing
  `bartons@example.com` because Alice's row, same household, provided it).
- **A row with both `ContactEmail` and `HouseholdName` blank** is still
  imported (as its own no-email household), but flagged back as a
  *warning*, not an error — the import doesn't fail, but you should go
  fix that guest's info before sending anything.
- Every guest in a household always has the household's contact email as
  their own `email` field (there's no separate per-guest email column in
  the CSV format).
- **Optional `PlusOnesAllowed` column**: how many guests a household may
  bring (`0`–`10`, or `yes`/`no` for 1/0). The last value in a household's
  rows wins; blank on every row means 0; a file without the column leaves
  allowances as they are. When it's above 0, the household's RSVP page asks
  "Bringing a guest?" (shown once someone in it is attending) and saves each
  guest as a plus-one in that household (`IsPlusOne=true`, attending, with
  meal and dietary notes). Whoever has the RSVP link edits or removes them
  later; plus-ones get no link or allowance of their own. Lowering the
  allowance never deletes a guest -- the import warns instead.
- `IsPlusOne` on its own (with `PlusOnesAllowed` 0) still works the old way:
  list a placeholder like "Guest of Ann" and the household answers for them
  like any other guest.

Upload it:

```bash
curl -s -b cookies.txt -X POST http://localhost:8000/api/v1/admin/households/import \
  -F "file=@guests.csv;type=text/csv"
```

```json
{
  "success": true,
  "message": "Guest list imported successfully. 1 row(s) need attention -- see warnings.",
  "warnings": [
    "Row 4 (Solo Sam): no ContactEmail and no HouseholdName -- imported as their own household with no contact email, so they won't receive any campaign emails until one is added."
  ]
}
```

Re-uploading the same CSV (or one with overlapping names) is safe — guests
are deduplicated by name within a household, so you won't get duplicates by
running an updated CSV through this endpoint again.

### 7. Review the guest list

```bash
# Paginated list (default 50/page, max 200)
curl -s -b cookies.txt "http://localhost:8000/api/v1/admin/households?limit=50&offset=0"

# Single household detail (grab an id from the list above)
curl -s -b cookies.txt "http://localhost:8000/api/v1/admin/households/<household_id>"
```

Each household includes its `invite_token` — that token is the magic link
credential a guest uses (`/invitations/{token}`, `/rsvp/{token}`), with no
separate login for guests at all.

### 8. Send a Save the Date campaign

Campaigns are a two-step process, deliberately: **create** a draft (nothing
is sent, nothing is even queued yet), then **fan it out** once you're sure
it's right.

```bash
# 1. Create the draft
curl -s -b cookies.txt -X POST http://localhost:8000/api/v1/admin/campaigns \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "save_the_date",
    "subject": "Save the Date!",
    "template_key": "save_the_date",
    "scheduled_for": "2026-08-01T09:00:00Z"
  }'
# -> {"status": "draft", "id": "<campaign_id>", ...}
```

`scheduled_for` must be in the future at creation time (rejected with a
`422`/`validation_error` otherwise). `template_key` must match an existing
file under `src/service_wed/templates/email/` — the ones that ship with this
repo are `save_the_date`, `rsvp_invite`, `reminder`, `final_details`,
`thank_you` (matching `CampaignType`'s values 1:1).

```bash
# 2. Review it, then fan it out
curl -s -b cookies.txt "http://localhost:8000/api/v1/admin/campaigns/<campaign_id>"

curl -s -b cookies.txt -X POST \
  "http://localhost:8000/api/v1/admin/campaigns/<campaign_id>/fan-out"
# -> {"status": "scheduled", ...}
```

Fan-out builds one `EmailMessage` row per household **that has a contact
email** (households without one, like Solo Sam above, are silently
skipped — go fix their info if you want them included) and flips the
campaign `draft -> scheduled`. It does **not** send anything itself — the
`worker` container's per-minute cron (`dispatch_due_emails`) claims
messages once their `scheduled_for` time arrives, and the `send_email` job
actually calls the email sender. Reschedule a still-`draft` campaign with:

```bash
curl -s -b cookies.txt -X POST \
  "http://localhost:8000/api/v1/admin/campaigns/<campaign_id>/schedule" \
  -H 'Content-Type: application/json' \
  -d '{"scheduled_for": "2026-08-05T09:00:00Z"}'
```

(Only works while the campaign is still `draft` — a `409`/`conflict` error
otherwise.)

### 9. Send an RSVP Invite campaign

Same two-step process, different `type`/`template_key`:

```bash
curl -s -b cookies.txt -X POST http://localhost:8000/api/v1/admin/campaigns \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "rsvp_invite",
    "subject": "You'\''re Invited -- RSVP Now!",
    "template_key": "rsvp_invite",
    "scheduled_for": "2026-08-10T09:00:00Z"
  }'

curl -s -b cookies.txt -X POST \
  "http://localhost:8000/api/v1/admin/campaigns/<campaign_id>/fan-out"
```

This is the email that actually puts each household's `invite_token` (magic
link) in front of them.

**If a send fails:** temporary errors (Resend rate limit `429`, Resend
`5xx`, network errors) are retried automatically, up to 5 attempts with a
growing wait (30s, 1m, 2m, 4m). The message stays `sending` meanwhile, with
the latest error in `last_error`. Permanent errors (e.g. `422` invalid
address) mark it `failed` right away. If Resend refuses for an
**account-level** reason (daily or monthly quota used up, bad API key,
sending domain not verified), the message goes back to `scheduled` for an
hour later, without using up an attempt, until the quota resets or the
account is fixed; if it's still refused 3 days after the first refusal, it's
marked `failed`. The error is in `last_error` meanwhile. Each message sends with a Resend idempotency key, so a retry never
delivers it twice.

**Reminder campaigns created by hand** (`"type": "reminder"`) go to the
same households the automatic ones would, minus the cap and interval:
households that were sent an RSVP invitation and haven't answered (or
answered "Not Sure Yet").

### 10. Guests respond

No admin auth here — the token itself is the credential. This is what your
frontend's RSVP page calls:

```bash
# Load the household + each guest's current status (pre-fills the form)
curl -s "http://localhost:8000/api/v1/rsvp/<invite_token>"

# Submit/edit responses
curl -s -X PUT "http://localhost:8000/api/v1/rsvp/<invite_token>" \
  -H 'Content-Type: application/json' \
  -d '{
    "responses": [
      {"guest_id": "<guest_id>", "status": "attending", "meal_choice": "Chicken", "dietary_notes": null},
      {"guest_id": "<guest_id_2>", "status": "declined", "meal_choice": null, "dietary_notes": null}
    ],
    "message_to_couple": "So excited for you two!",
    "song_request": "Mr. Brightside"
  }'
```

`status` is one of `attending`, `declined`, `waiting`. Submitting again with
the same guest IDs **edits** the existing response (upsert, not append) —
guests can change their mind up until `rsvp_deadline`. A successful submit
also queues an `rsvp_confirmation` email to the household's contact email
(if one is on file) — same delivery pipeline as campaigns, so it goes out
on the worker's next `dispatch_due_emails` tick, not synchronously inline.
Rejections you'll see here:

| Condition | Status | Error code |
|---|---|---|
| Token doesn't match any household | `404` | `not_found` |
| `now < rsvp_opens_at` | `409` | `rsvp_closed` |
| `now > rsvp_deadline` | `409` | `rsvp_closed` |
| A `guest_id` doesn't belong to this household | `400` | `validation_error` |

If a guest loses their link, `POST /invitations/recover` accepts a
name+email and always returns the same generic success message regardless
of whether it matched anything (prevents email enumeration). If the email
matches a household AND the name matches that household's display name or
one of its guests, a `magic_link_recovery` email queues with the link;
otherwise nothing is sent, but the response is identical either way.

### 11. Reminders (automatic)

The `worker` container runs `evaluate_reminders` once a day at 09:00
**venue time** (`WorkerSettings.timezone`, so it doesn't depend on the
container's UTC clock). If any households are due, it creates and fans out a
`REMINDER` campaign to just those households, in one step (no separate
create/fan-out call needed, unlike the manual campaigns above). Nothing for
you to trigger by hand in normal operation.

A household gets a reminder only when **all** of these hold (see
`services/reminders.py`):

1. RSVPs are open: after `rsvp_opens_at` (if set) and before `rsvp_deadline`.
2. It was actually sent an RSVP invitation (step 9) — an `rsvp_invite`
   email with status `sent`. Uploading a guest list alone never triggers
   reminders.
3. At least one of its guests hasn't responded, or answered "Not Sure Yet".
4. It has had fewer than `reminder_cap` reminders. `0` turns reminders off.
5. `reminder_interval_days` have passed since its last contact: the
   invitation, or its most recent reminder.

To test this without waiting for the daily schedule, enqueue the job from
inside the worker container (Redis isn't reachable from the host):

```bash
docker compose exec worker python -c "
import asyncio, os
from arq import create_pool
from arq.connections import RedisSettings

async def main():
    redis = await create_pool(RedisSettings.from_dsn(os.environ['REDIS_URL']))
    await redis.enqueue_job('evaluate_reminders')
    await redis.aclose()

asyncio.run(main())
"
docker compose logs worker --tail 20
```

### 12. Final Details campaign

Same pattern again, once logistics are locked in:

```bash
curl -s -b cookies.txt -X POST http://localhost:8000/api/v1/admin/campaigns \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "final_details",
    "subject": "Final Details for Our Big Day",
    "template_key": "final_details",
    "scheduled_for": "2027-06-01T09:00:00Z"
  }'

curl -s -b cookies.txt -X POST \
  "http://localhost:8000/api/v1/admin/campaigns/<campaign_id>/fan-out"
```

### 13. Thank You campaign (post-wedding)

```bash
curl -s -b cookies.txt -X POST http://localhost:8000/api/v1/admin/campaigns \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "thank_you",
    "subject": "Thank You!",
    "template_key": "thank_you",
    "scheduled_for": "2027-06-20T09:00:00Z"
  }'

curl -s -b cookies.txt -X POST \
  "http://localhost:8000/api/v1/admin/campaigns/<campaign_id>/fan-out"
```

### 14. Dashboard and exports

```bash
# RSVP + delivery summary for an admin dashboard screen
curl -s -b cookies.txt http://localhost:8000/api/v1/admin/dashboard

# Full guest list snapshot as CSV (seating chart, caterer headcount, etc.)
curl -s -b cookies.txt http://localhost:8000/api/v1/admin/exports/guests.csv -o guests-export.csv
```

Dashboard delivery counts come straight from `EmailMessage.status` and
`EmailEvent` (bounced/complained), and reflect real send outcomes as soon as
the worker processes them.

### 15. Logging out / rotating the admin session

```bash
curl -s -b cookies.txt -X POST http://localhost:8000/api/v1/auth/logout
```

Revokes the session **server-side** (not just deleting the cookie
client-side) — a subsequent request with the same old cookie gets `401`.

### 16. Tearing down

```bash
# Stop everything, keep all data (Postgres/Redis volumes untouched)
docker compose down

# Stop everything AND wipe the database/redis volumes -- irreversible,
# you'll need to redo migrations + admin seeding next time
docker compose down -v
```

---

## Testing

There is currently **no automated test suite** (no `pytest` tests exist yet,
despite `pytest`/`pytest-asyncio` being dev dependencies) — everything below
is manual verification against a running stack, which is also how this app
has actually been exercised so far.

### Static checks

```bash
uv run ruff check src/service_wed
uv run mypy src/service_wed
```

### Smoke test (fast path)

Health, then one full loop through the [usage walkthrough](#usage-end-to-end-walkthrough)
above (login → wedding → CSV import → campaign fan-out → RSVP) is the
fastest way to catch a regression across the whole request path. A few
targeted things worth checking beyond the happy path:

**Auth guard** — every `/admin/*` route should reject with `401` when the
cookie is missing/invalid/expired:
```bash
curl -s -i http://localhost:8000/api/v1/admin/campaigns | head -5
```

**Rate limiting**, per visitor IP:
- login: 10 attempts per 5 minutes;
- invitation-token lookups: 30 per 5 minutes, shared between
  `/invitations/{token}` and `/rsvp/{token}`;
- RSVP submits: 20 per 5 minutes;
- magic-link recovery: 5 per 15 minutes.

Behind a proxy, the visitor IP comes from `CLIENT_IP_HEADER` (see
[Configuration](#configuration)).
```bash
for i in $(seq 1 12); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8000/api/v1/auth/login \
    -H 'Content-Type: application/json' -d '{"email":"x@x.com","password":"wrongwrongwrong"}'
done
# expect 401 x10, then 429 x2
```

**Delivery pipeline** — verify a scheduled message actually gets claimed and
sent, without waiting for its real `scheduled_for` time:
```bash
# Backdate a message so the next cron tick claims it
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
UPDATE email_messages SET scheduled_for = now() - interval '1 minute' WHERE id = '<id>';
SQL
docker compose logs worker --tail 20 --follow
# within ~60s: "cron:dispatch_due_emails" claims it, "send_email" runs,
# and (with no RESEND_API_KEY set) the console sender prints the "email"
```

**Webhook signature verification** — Resend signs callbacks using the Svix
HMAC scheme (`svix-id`/`svix-timestamp`/`svix-signature` headers). To test
it locally, run a throwaway instance with a fake secret rather than
reconfiguring the real stack:
```bash
docker run -d --rm --name webhook-test --network service-wed_default \
  -e DATABASE_URL="postgresql+asyncpg://$POSTGRES_USER:$POSTGRES_PASSWORD@db:5432/$POSTGRES_DB" \
  -e REDIS_URL="redis://redis:6379/0" \
  -e RESEND_WEBHOOK_SECRET="whsec_MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAw" \
  -p 8001:8000 \
  service-wed-service-wed
```
```python
# compute a matching signature
import base64, hashlib, hmac, json
secret = "whsec_MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAw"
secret_bytes = base64.b64decode(secret.removeprefix("whsec_"))
body = json.dumps({"type": "email.bounced", "created_at": "2026-01-01T00:00:00Z", "data": {"email_id": "<a real provider_message_id>"}})
msg_id, timestamp = "msg_test_1", "1751846400"
sig = base64.b64encode(hmac.new(secret_bytes, f"{msg_id}.{timestamp}.{body}".encode(), hashlib.sha256).digest()).decode()
```
```bash
# valid signature -> 200, and flips that EmailMessage to `failed`
curl -s -i -X POST http://localhost:8001/api/v1/webhooks/resend \
  -H 'Content-Type: application/json' -H 'svix-id: msg_test_1' \
  -H 'svix-timestamp: 1751846400' -H "svix-signature: v1,<sig>" --data-binary @body.json

# tampered/missing signature -> 401 either way
curl -s -i -X POST http://localhost:8001/api/v1/webhooks/resend \
  -H 'Content-Type: application/json' -H 'svix-id: msg_test_1' \
  -H 'svix-timestamp: 1751846400' -H 'svix-signature: v1,bogus==' --data-binary @body.json
```
```bash
docker stop webhook-test   # cleanup -- --rm removes it automatically
```

(Export `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` from your `.env`
first. `service-wed-service-wed` is the image `docker compose build` makes
in this directory.)

**Reminder cadence** — enqueue `evaluate_reminders` twice in a row (see
[step 11](#11-reminders-automatic)); the second call should create *no* new
campaign if `reminder_interval_days` hasn't elapsed since the last one —
check the `campaigns` table row count didn't change.

---

## Integrating with a React + Vite + Node.js frontend

`ui-wed` already does all of this (see `ui-wed/src/lib/api.ts`). There are
two setups:

- **Production, and the root compose:** Traefik serves the frontend and
  `/api` on one origin. Calls are relative (`/api/v1/...`), so there's no CORS
  and the `Secure` cookie works over HTTPS.
- **Local dev:** either Vite's proxy (same origin, no CORS), or cross-origin
  calls to `http://localhost:8000` with `VITE_API_BASE_URL`. The rest of this
  section is about the cross-origin case.

### CORS

The API's `CORS_ALLOW_ORIGINS` setting already defaults to
`http://localhost:3000,http://localhost:5173` (Vite's default dev port is
`5173`). If your frontend runs somewhere else, add it:

```
CORS_ALLOW_ORIGINS=http://localhost:5173,https://your-real-domain.com
```

`allow_credentials=True` is set alongside it — required for the
cookie-based session below, but it means the origin list **cannot** be `*`;
every origin the frontend might run from has to be listed explicitly.

### Cookie-based auth

Admin auth is a plain httponly session cookie, not a bearer token — there is
**no token for the frontend to store or attach manually**. Two things every
`fetch` call needs to get right:

1. **Always pass `credentials: "include"`** — without it, the browser won't
   send the cookie on cross-origin requests (frontend on `:5173`, API on
   `:8000` counts as cross-origin even though both are `localhost`).
2. **The cookie is `Secure` unless `DEBUG=true`** on the API. Browsers won't
   send a `Secure` cookie over plain `http://`. Chrome and Firefox make an
   exception for `localhost`, but Safari doesn't. For local development, set
   `DEBUG=true` in the API's environment. In production, serve over HTTPS and
   leave `DEBUG` off.

A minimal version of the pattern (`ui-wed/src/lib/api.ts` is the real one,
and defaults to `""`, i.e. same origin):

```ts
// api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/api/v1${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body);
  }
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`API error ${status}`);
  }
}
```

`.env` for the Vite app:

```
VITE_API_BASE_URL=http://localhost:8000
```

### Error handling

Two response shapes to handle, depending on where the error came from:

- **Business-rule errors** (from `services/`, e.g. RSVP deadline passed,
  campaign already scheduled) come back as:
  ```json
  { "error": { "code": "rsvp_closed", "message": "RSVPs are not open yet." } }
  ```
  `code` is the stable, switch-on-able value (`not_found`, `conflict`,
  `validation_error`, `invalid_credentials`, `rsvp_closed`, `bad_request`,
  `internal_error`); `message` is a human-readable string for display, not
  for branching logic.
- **Request validation errors** (bad/missing fields, from FastAPI/Pydantic
  itself, before your data ever reaches a service) and **auth failures**
  (`401`/`429`) keep FastAPI's native shape instead:
  ```json
  { "detail": [{ "type": "missing", "loc": ["body", "name"], "msg": "Field required" }] }
  ```
  or, for auth/rate-limit/webhook-signature failures, `{ "detail": "<string>" }`.

A frontend error handler needs to check for `error` vs. `detail` in the body
to know which shape it's looking at.

### Pagination

Both list endpoints (`GET /admin/campaigns`, `GET /admin/households`) take
`?limit=` (default 50, max 200) and `?offset=` query params and return:

```json
{ "items": [...], "total": 47, "limit": 50, "offset": 0 }
```

`total` is the full row count regardless of the page requested — enough to
render "Page 1 of 1" / a page-count control without a second request.

### Public vs. admin endpoints

| | No auth needed | Requires admin cookie |
|---|---|---|
| **Read** | `GET /wedding`, `GET /invitations/{token}`, `GET /rsvp/{token}` | `GET /admin/wedding`, `GET /admin/campaigns[/{id}]`, `GET /admin/households[/{id}]`, `GET /admin/dashboard`, `GET /admin/exports/guests.csv` |
| **Write** | `PUT /rsvp/{token}`, `POST /invitations/recover` | `PUT /admin/wedding`, `POST /admin/campaigns`, `POST /admin/campaigns/{id}/schedule`, `POST /admin/campaigns/{id}/fan-out`, `POST /admin/households/import`, `POST /auth/login`, `POST /auth/logout` |

The public pages (landing page, countdown, venue info, RSVP form) only ever
need the left column. Everything in the right column is the admin
dashboard's job, and should redirect to a login screen on a `401`.

### A note on tokens in URLs

Magic-link tokens (`invite_token`) are meant to be embedded directly in a
frontend route. ui-wed uses `https://<site>/rsvp/<invite_token>`, the same
`{{ rsvp_url }}` the emails link to (`PUBLIC_SITE_URL` + `/rsvp/<token>`). The
frontend reads it from the URL and passes it straight through to
`GET/PUT /rsvp/{token}`. There's no session or cookie involved on this path
at all; the token itself is the credential, so treat it with the same care
you'd give a password reset link (don't log full URLs containing it,
don't put it somewhere a referrer header could leak it to a third party).

---

## API reference

All routes are mounted under `/api/v1`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health/live` | none | Process liveness |
| GET | `/health/ready` | none | DB connectivity check |
| GET | `/health/worker` | none | Email worker is alive (its Redis heartbeat is under a minute old); `503` otherwise |
| POST | `/auth/login` | none (rate-limited) | Start an admin session |
| POST | `/auth/logout` | admin | Revoke the current admin session |
| GET | `/wedding` | none | Public wedding config (date, venue, RSVP deadline) |
| GET | `/invitations/{token}` | none (rate-limited) | Look up a household + guests by magic link |
| POST | `/invitations/recover` | none (rate-limited) | Request a lost magic link by name+email |
| GET | `/rsvp/{token}` | none (rate-limited) | Same data as invitation lookup, for the RSVP form |
| PUT | `/rsvp/{token}` | none (rate-limited) | Submit/edit RSVP responses |
| GET | `/admin/wedding` | admin | Read the wedding config (admin view, includes reminder settings) |
| PUT | `/admin/wedding` | admin | Create/update the wedding config |
| GET | `/admin/campaigns` | admin | Paginated campaign list |
| POST | `/admin/campaigns` | admin | Create a campaign draft |
| GET | `/admin/campaigns/{id}` | admin | Campaign detail |
| POST | `/admin/campaigns/{id}/schedule` | admin | Reschedule a draft campaign |
| POST | `/admin/campaigns/{id}/fan-out` | admin | Lock in a draft, build its EmailMessages |
| GET | `/admin/households` | admin | Paginated household/guest list |
| GET | `/admin/households/{id}` | admin | Household detail |
| POST | `/admin/households/import` | admin | Upload a guest-list CSV |
| GET | `/admin/dashboard` | admin | RSVP + delivery summary stats |
| GET | `/admin/exports/guests.csv` | admin | Full guest-list CSV snapshot |
| POST | `/webhooks/resend` | Svix signature | Resend delivery-event callback |

Interactive docs (Swagger UI) are at `http://localhost:8000/docs` when you
run this directory's compose file. They aren't reachable in production,
because Traefik only routes `/api/*` to the API.

---

## Known limitations

Worth knowing before you rely on these:

- **Campaign status doesn't track past `scheduled`.** `CampaignStatus` has
  `SENDING`/`SENT`/`CANCELED` members, but nothing in the codebase ever
  assigns them — a fanned-out campaign shows `scheduled` forever, even
  after every one of its emails has actually sent. Check
  `GET /admin/dashboard`'s delivery stats (or query `email_messages`
  directly) for real delivery state, not the campaign's own `status` field.
  There's also no way to cancel a campaign once fanned out short of editing
  the database directly.
- **CSV import: conflicting emails for one household.** If two rows for the
  same `HouseholdName` give different `ContactEmail`s, the first one wins,
  and the second is dropped without a warning.
- **No automated test suite.** See [Testing](#testing) — everything is
  manual verification against a running stack right now.
- **No self-service admin registration**, by design — see
  [step 3](#3-seed-the-admin-account).
