# :star: wedsite

A full-stack wedding website for one wedding: event details, photos, things to
do, magic-link RSVPs, and an admin area for the guest list and email campaigns
(save the date, invitations, reminders, final details, thank-yous).

| Package | What | Stack |
|---|---|---|
| [`ui-wed`](ui-wed/README.md) | Public site + admin UI | Vite, React 19, TypeScript, Tailwind; served by nginx |
| [`service-wed`](service-wed/README.md) | API + background worker | FastAPI, SQLAlchemy (async), Alembic, PostgreSQL 18, Redis + arq, Resend |

## Deploying

Production runs on a single small server (Hetzner or AWS) behind a Cloudflare
Tunnel. GitHub Actions scans for secrets and builds the images, and
`deploy/deploy.sh` on the server deploys a chosen commit. Setup, the CI/CD
pipeline, both hosting options, and how to test it all locally are in
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
email; Postgres and Redis sit on an internal network.

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

**Try the admin area:** go to `http://localhost:5173/admin`. It redirects to
`/admin/login`, then to the dashboard at `/admin/admin_dashboard`, which has
**Dashboard**, **Guests**, **Campaigns** and **Wedding** tabs. On the
**Guests** tab you can download and upload the guest list CSV (format:
[service-wed README, step 6](service-wed/README.md#6-build-and-upload-the-guest-list)).
**Log out** revokes the session on the server.

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

```bash
cd service-wed && uv run ruff check src && uv run mypy src
cd ui-wed && npm run lint && npm run build     # build also type-checks (tsc -b)
```

There's no automated test suite yet. Changes are checked against a running
stack; see [service-wed README → Testing](service-wed/README.md#testing).
