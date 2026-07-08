# service-wed

Backend API for a wedding website: guest RSVPs, magic-link invitations, admin-run
email campaigns (save-the-date, RSVP invites, reminders, final details, thank
you), and delivery tracking via Resend webhooks.

Built with FastAPI + SQLAlchemy (async) + PostgreSQL + Redis/arq, following a
lightweight hexagonal layout (`controllers/` → `services/` → `ports/` +
`adapters/`). This app is designed for **one wedding, one admin account** (the
couple) — there's no multi-tenant or self-service registration model.

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

Two separate places configure this app, and it's easy to conflate them:

- **`docker-compose.yml`** sets the environment for the containers
  themselves (`service-wed` and `worker`). Inside the Docker network they talk
  to Postgres/Redis by service name (`db`, `redis`), not `localhost`.
- **`.env`** (repo root) is read by anything you run *from the host* —
  Alembic migrations, one-off admin-seeding scripts, etc. It points at
  `localhost` because that's how the host sees the containers' **published**
  ports (`5432`, `6379`, `8000`).

Both need to stay in sync with `docker-compose.yml`'s `ports:` mappings if you
ever change them.

| Variable | Default | Used by | Notes |
|---|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://wedding_db_user:wedding_db_pw@db:5432/wedding_db` | API, worker, Alembic | Must use the `asyncpg` driver |
| `REDIS_URL` | `redis://redis:6379` | API, worker | Shared by the arq queue *and* the rate limiter |
| `DEBUG` | `false` | API | See [cookie note](#cookie-based-auth) below — controls the admin session cookie's `Secure` flag and SQL echo logging |
| `RESEND_API_KEY` | unset | API | If unset, emails are printed to stdout via a console sender instead of actually sent |
| `RESEND_FROM_ADDRESS` | `wedding@example.com` | API | From-address used when `RESEND_API_KEY` is set |
| `RESEND_WEBHOOK_SECRET` | unset | API | Resend/Svix webhook signing secret. If unset, `/webhooks/resend` accepts payloads **without verifying** them (logs a warning) — only acceptable for local dev, must be set before this is reachable from the internet |
| `SESSION_COOKIE_NAME` | `admin_session` | API | |
| `CORS_ALLOW_ORIGINS` | `http://localhost:3000,http://localhost:5173` | API | Comma-separated list of allowed frontend origins |

---

## Usage: end-to-end walkthrough

Everything below uses `curl` against `http://localhost:8000`. If you're
testing a deployed instance instead of local Docker, swap in your real
domain/HTTPS — and see the [cookie note](#cookie-based-auth) about `DEBUG`
before you do.

> **Shortcut:** steps 1–6 below (start the stack, migrate, seed the admin
> account, log in, create the wedding, upload a blank guest list) are all
> scripted in [`scripts/bootstrap.sh`](scripts/bootstrap.sh). Set
> `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `WEDDING_DATE`, and `RSVP_DEADLINE` (plus
> any of the optional wedding fields you want) in `.env`, then run:
> ```bash
> ./scripts/bootstrap.sh
> ```
> It's idempotent, so re-running it is safe. **If you use it, skip straight
> to [step 7](#7-review-the-guest-list)** — everything through step 6 is
> already done. Read steps 1–6 anyway if you want to understand what the
> script is doing or need to do any of it manually (e.g. against a
> deployed instance without shell access to run the script).

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
```

### 2. Run migrations

Run from the host (uses `.env`'s `DATABASE_URL`, which points at
`db:5432` — the port Docker published):

```bash
uv run alembic upgrade head
```

### 3. Seed the admin account

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
try to expand inside double quotes:

```bash
cat > seed_admin.sql <<'EOF'
INSERT INTO admin_users (id, email, password_hash)
VALUES (gen_random_uuid(), 'you@example.com', 'PASTE_YOUR_FULL_HASH_HERE');
EOF
PGPASSWORD=wedding_db_pw psql -h localhost -U wedding_db_user -d wedding_db -f seed_admin.sql
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
    "reminder_cap": 2,
    "reminder_interval_days": 7
  }'
```

Notes:
- `wedding_date` and `rsvp_deadline` are required; `rsvp_deadline` must not
  be after `wedding_date`, and `rsvp_opens_at` (optional) must be before
  `rsvp_deadline` — both are validated and return `422` if violated.
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

The `worker` container runs `evaluate_reminders` once a day (09:00
worker-local time). It finds every household with at least one guest who
hasn't responded, checks each against `reminder_cap`/`reminder_interval_days`
from the wedding config, and — if any are due — creates and fans out a
`REMINDER` campaign to just those households, in one step (no separate
create/fan-out call needed, unlike the manual campaigns above). Nothing for
you to trigger by hand in normal operation.

To test this without waiting for the daily schedule, enqueue the job
directly against the running worker:

```bash
uv run python -c "
import asyncio
from arq import create_pool
from arq.connections import RedisSettings

async def main():
    redis = await create_pool(RedisSettings.from_dsn('redis://redis:6379/0'))
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

**Rate limiting** — login is capped at 10 attempts / 5 minutes per IP;
invitation-token lookups (shared between `/invitations/{token}` and
`/rsvp/{token}`) at 30 / 5 minutes; magic-link recovery at 5 / 15 minutes:
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
psql ... -c "UPDATE email_messages SET scheduled_for = now() - interval '1 minute' WHERE id = '<id>';"
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
  -e DATABASE_URL="postgresql+asyncpg://wedding_db_user:wedding_db_pw@db:5432/wedding_db" \
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

**Reminder cadence** — enqueue `evaluate_reminders` twice in a row (see
[step 11](#11-reminders-automatic)); the second call should create *no* new
campaign if `reminder_interval_days` hasn't elapsed since the last one —
check the `campaigns` table row count didn't change.

---

## Integrating with a React + Vite + Node.js frontend

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
2. **The cookie is `Secure` unless `DEBUG=true`** on the API. A browser will
   silently refuse to send a `Secure` cookie back over plain `http://`. For
   local development against `http://localhost:8000`, set `DEBUG=true` in
   the API's environment; in production, serve the API over HTTPS instead
   and leave `DEBUG` off.

```ts
// api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

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
frontend route, e.g. `https://yoursite.com/rsvp?token=<invite_token>` — the
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

Interactive docs (Swagger UI) are available at `/docs` whenever the API is
running.

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
- **No automated test suite.** See [Testing](#testing) — everything is
  manual verification against a running stack right now.
- **No self-service admin registration**, by design — see
  [step 3](#3-seed-the-admin-account).
