# :star: wedsite

A full-stack wedding website for one wedding. Guests get the event details,
photos, travel and things to do, and RSVP through a private link emailed to
their household. The couple gets an admin area to manage the guest list, send
email campaigns (save the date, invitations, final details, thank-yous), and
track RSVPs. Reminders to RSVP go out automatically.

| Package | What | Stack |
|---|---|---|
| [`ui-wed`](ui-wed/README.md) | Public site + admin UI | Vite, React 19, TypeScript, Tailwind; served by nginx |
| [`service-wed`](service-wed/README.md) | API + background worker | FastAPI, SQLAlchemy (async), Alembic, PostgreSQL 18, Redis + arq, Resend |

## How it works

### For guests

1. Each household gets an RSVP invitation email with a private link
   (`/rsvp/<token>`). The link is the only "login": anyone who has it can
   view and change that household's RSVP.
2. On that page they answer for everyone in the household: attending,
   declining or "Not Sure Yet", plus meal choice, dietary notes, a message
   to the couple and a song request. A confirmation email follows.
3. They can come back and change their answers until the RSVP deadline. The
   form opens with what they entered last time.
4. Lost the link? **RSVP** in the menu leads to `/find-invitation`, where
   entering a name and the email on file sends the link again.

The rest of the site (Our Story, Wedding Party, Things To Do, Travel, Photos,
Registry) is public. Before `RSVP_OPENS_AT`, RSVP pages show "Coming Soon".

### For the couple

The admin area is at `/admin`. In production it sits behind Cloudflare Access
as well as the admin password. It has four tabs: **Dashboard**, **Guests**,
**Campaigns** and **Wedding**.

A typical timeline:

| When | Do this | Where |
|---|---|---|
| Once | Check the dates, venue and reminder settings | **Wedding** tab |
| Once, then whenever it changes | Upload the guest list CSV (one row per guest). Re-uploading adds and updates without duplicating anyone (it never removes guests). Tip: add yourselves as a household, so you receive every email too | **Guests** tab ([CSV format](service-wed/README.md#6-build-and-upload-the-guest-list)) |
| Months before | Save the Date campaign | **Campaigns** tab |
| When RSVPs open | RSVP Invite campaign: the email with each household's private link | **Campaigns** tab |
| Until the deadline | Nothing: reminders are automatic (below). Watch responses and delivery problems | **Dashboard** tab |
| Weeks before | Final Details campaign | **Campaigns** tab |
| After | Thank You campaign. Download the guest list with RSVPs for the caterer and seating | **Campaigns** tab, **Guests** tab |

A campaign is created as a **draft** with a send time (**New Campaign** →
**Create Draft**). **Fan Out Now** locks it in: it creates one email per
household with an email address, and they go out at the scheduled time.
Nothing is sent while it's still a draft.

### Emails behind the scenes

The worker container sends every email through Resend. It checks for emails
that are due every minute, sends at most a few per second, and retries
temporary failures by itself. Emails Resend can't deliver (bounces, invalid
or suppressed addresses) show as **failed** on the dashboard. If the Resend
account is blocked for a while (daily quota used up, bad API key), emails
wait and go out once that's fixed.

**Automatic reminders** run every day at 09:00 Durango time. A household gets
one only if all of these are true:
- RSVPs are open (after `RSVP_OPENS_AT`, before `RSVP_DEADLINE`);
- it was sent the RSVP invitation email;
- someone in it hasn't answered, or answered "Not Sure Yet";
- it has had fewer than `reminder_cap` reminders, and at least
  `reminder_interval_days` have passed since its invitation or last reminder.

Both settings are on the **Wedding** tab. Uploading a guest list never sends
anything by itself. Details: [service-wed README, step 11](service-wed/README.md#11-reminders-automatic).

## Deploying

Production runs on a single small server (currently AWS EC2; Hetzner also
works) behind a Cloudflare Tunnel. GitHub Actions scans for secrets, runs the
lint checks and tests, and builds the images; `deploy/deploy.sh` on the server
deploys a chosen commit. Setup, the CI/CD pipeline, both hosting options,
monitoring and how to test it all locally are in
**[deploy/README.md](deploy/README.md)**.

## Repository layout

```
.
├── ui-wed/                  # frontend (see ui-wed/README.md)
├── service-wed/             # backend (see service-wed/README.md)
│   └── docker-compose.yml   #   backend-only dev stack: db, redis, API on :8000, worker
├── docker-compose.yml       # production stack (also runs locally, see below)
├── docker-compose-test.yml  # LAN/HTTPS variant for testing on another device
├── traefik/dynamic.yml      # security headers + CSP (Traefik file provider)
├── deploy/                  # deploy.sh, server setup, cloud-init, local server simulator
├── .github/workflows/ci.yml # secret scan + image builds
└── .env.example             # template for the root .env
```

Production request path: `browser → Cloudflare → tunnel (cloudflared) →
Traefik → /api/* to service-wed, everything else to ui-wed`. The worker sends
email; Postgres and Redis sit on an internal network. Health checks:
`/api/v1/health/ready` (API and database) and `/api/v1/health/worker` (the
email worker).

## Environment files

| File | Feeds | Template |
|---|---|---|
| `.env` (root) | `docker-compose.yml`, `docker-compose-test.yml`, and the production server | `.env.example` |
| `service-wed/.env` | `service-wed/docker-compose.yml`, `service-wed/scripts/bootstrap.sh` | `service-wed/.env.example` |
| `ui-wed/.env.local` | `npm run dev` only (Vite `VITE_*` values) | `ui-wed/.env.example` |

All three are gitignored. Wedding dates in all of them are **Durango (venue)
local time**, e.g. `WEDDING_DATE=2027-09-04` or
`RSVP_DEADLINE=2027-06-28T23:59:59`; see the note in `.env.example`.

## Running locally

### Option 1: development (fast reload)

The backend runs in Docker and the frontend runs with Vite's dev server.

```bash
# 1. Backend: db, redis, API on http://localhost:8000, worker
cd service-wed
cp .env.example .env        # set POSTGRES_PASSWORD, ADMIN_EMAIL/ADMIN_PASSWORD,
                            # WEDDING_DATE, RSVP_DEADLINE (and DEBUG=true, below)
docker compose up -d --build
```

On first start, the API container runs the migrations and creates the admin
account and wedding config from `.env`. If those already exist, it leaves them
alone (see `service-wed/README.md`).

Set `DEBUG=true` in `service-wed/.env` for local development. Otherwise the
admin cookie is `Secure`, and some browsers (Safari) won't send it over plain
`http://localhost`.

```bash
# 2. Frontend on http://localhost:5173
cd ../ui-wed
npm install
npm run dev
```

With `VITE_API_BASE_URL` unset, the frontend calls `/api/...` on its own
origin, and Vite proxies that to `localhost:8000` (see `vite.config.ts`), so
no CORS setup is needed. To call the API cross-origin instead, as
`ui-wed/.env.example` does, copy it to `.env.local`. The API already allows
`http://localhost:5173` (`CORS_ALLOW_ORIGINS`).

**Try the admin area:** go to `http://localhost:5173/admin` and log in with
`ADMIN_EMAIL`/`ADMIN_PASSWORD` (see [How it works](#for-the-couple)). With
no `RESEND_API_KEY` set, the worker prints emails to its log instead of
sending them (`docker compose logs worker`), so local testing never emails
anyone.

### Option 2: the production stack, locally

This uses the same compose file, images and Traefik config as the server,
without the tunnel. Fill in the root `.env` from `.env.example` first.

```bash
# from the repo root -- list the services so cloudflared is NOT started
docker compose up -d --build db redis service-wed worker traefik ui-wed socket-proxy
```

The site is at `http://localhost` (or `HTTP_PORT`), and the API at
`http://localhost/api/v1/...`. Never start the `cloudflared` service locally:
with the real `CLOUDFLARE_TUNNEL_TOKEN`, your laptop would start serving the
live domain.

### Option 3: a simulated server

To rehearse a real deploy (`deploy.sh`, `status`, `rollback`), see
[deploy/README.md → Testing](deploy/README.md#testing).

### `docker-compose-test.yml`

This is a variant for testing from other devices on your LAN, over HTTPS
(Traefik's self-signed certificate). It publishes ports 80 and 443, the
**unauthenticated** Traefik dashboard on 8080, and Postgres (5432) and Redis
(6379) on **all interfaces**. Use it only on a trusted network, and stop it
afterwards. Ports can be changed with `HTTPS_PORT`, `TRAEFIK_DASHBOARD_PORT`,
`POSTGRES_PORT` and `REDIS_PORT` in the root `.env`.

## Checks

The same checks CI runs, from the repo root:

```bash
(cd service-wed && uv run ruff check src tests && uv run ruff format --check src tests \
  && uv run mypy src && uv run pytest -q)
(cd ui-wed && npm run lint && npm run format:check && npm run build)   # build also type-checks
```

`service-wed/tests/` covers the email rules (reminders, sending, retries) and
needs no database. Everything else is checked against a running stack; see
[service-wed README → Testing](service-wed/README.md#testing).
