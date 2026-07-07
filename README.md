# wedsite

A simple full-stack wedding web application — event details, RSVP, and guest info for our wedding.

The project is split into two independently deployable services:

| Package      | Description                                   | Stack                                              |
|--------------|------------------------------------------------|-----------------------------------------------------|
| `ui-wed`     | Frontend web app                                | Vite, React, TypeScript                              |
| `service-wed`| Backend API                                     | FastAPI, PostgreSQL, SQLAlchemy, Alembic, Pydantic   |


## Repository Structure

```
wedsite/
├── ui-wed/          # React frontend (Vite)
├── service-wed/      # FastAPI backend
├── docker-compose.yml
└── README.md
```

---

## ui-wed (Frontend)

Built with **Vite** + **React** (TypeScript).

### Getting started

```bash
cd ui-wed
npm install
npm run dev
```

The app runs at `http://localhost:5173` by default and expects `service-wed` to be running (see `.env` for the API base URL).

### Environment variables

```
VITE_API_BASE_URL=http://localhost:8000
```

---

## service-wed (Backend)

Built with **FastAPI**, **PostgreSQL**, **SQLAlchemy**, **Alembic**, and **Pydantic**, following a **hexagonal (ports & adapters) architecture**.

### Architecture

Hexagonal architecture keeps the domain logic independent of frameworks and infrastructure. Inbound adapters (HTTP) and outbound adapters (database, email, etc.) plug into the core through defined ports (interfaces).

### Getting started

```bash
cd service-wed

uv sync

cp .env.example .env

# Run database migrations
alembic upgrade head

# Start the API
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000`, with interactive docs at `http://localhost:8000/docs`.

### Environment variables

```
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/wedsite
SECRET_KEY=change-me
CORS_ORIGINS=http://localhost:5173
```

### Database migrations (Alembic)

```bash
# Create a new migration after changing SQLAlchemy models
alembic revision --autogenerate -m "describe your change"

# Apply migrations
alembic upgrade head
```

---

## Running everything locally

```bash
docker compose up --build
```

This starts PostgreSQL, `service-wed`, Redis, Traefik, and `ui-wed` together.

| Service     | URL                          |
|-------------|-------------------------------|
| Frontend    | http://localhost:5173         |
| API         | http://localhost:8000         |
| API docs    | http://localhost:8000/docs    |

---

## Local dev: admin login + guest list CSV (verified path)

The section above uses the root `docker-compose.yml` (Traefik + a
containerized `ui-wed`), which is a separate, still-in-progress
reverse-proxy setup. The steps below are the ones actually exercised
end-to-end -- backend in Docker via `service-wed`'s own compose file,
frontend run directly with `npm run dev` (no container) -- to test the
admin login and guest-list CSV import/export flow in a real browser.

### 1. Start the backend

```bash
cd service-wed
cp .env.example .env   # if you don't already have one
```

Edit `service-wed/.env` and set `DEBUG=true`. This is required locally:
with `DEBUG=false` the admin session cookie is marked `Secure`, and a
browser won't send it back over plain `http://localhost:5173` (see
`service-wed/README.md`'s ["Integrating with a React + Vite + Node.js
frontend"](service-wed/README.md#integrating-with-a-react--vite--nodejs-frontend)
section for why). `CORS_ALLOW_ORIGINS` already defaults to include
`http://localhost:5173`, so it only needs setting if your frontend runs
somewhere else.

```bash
docker compose up -d --build   # starts db, redis, service-wed, worker
uv run alembic upgrade head
```

### 2. Seed the one admin account

There's no self-service registration -- see `service-wed/README.md`'s
["3. Seed the admin
account"](service-wed/README.md#3-seed-the-admin-account) for the manual
steps, or simplest, set `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`WEDDING_DATE`/
`RSVP_DEADLINE` in `service-wed/.env` and run the bundled script, which
does this (plus creates the wedding config) in one idempotent step:

```bash
./scripts/bootstrap.sh
```

### 3. Start the frontend

```bash
cd ../ui-wed
cp .env.example .env.local
npm install
npm run dev
```

`ui-wed/.env.example`'s `VITE_API_BASE_URL=http://localhost:8000` already
matches step 1's default, so `.env.local` shouldn't need editing unless
the API runs elsewhere.

### 4. Test the integration in a browser

- Visit `http://localhost:5173/admin/guests` while logged out -- it
  should redirect to `/admin/login`.
- Log in with the admin account from step 2.
- On the guest list page (`/admin/guests`):
  - **Download CSV** -- pulls the current `guests.csv` snapshot from
    `GET /admin/exports/guests.csv`.
  - **Upload CSV** -- pick a CSV with `HouseholdName,ContactEmail,
    GuestName,IsPlusOne` headers (see `service-wed/README.md`'s ["Build
    and upload the guest
    list"](service-wed/README.md#6-build-and-upload-the-guest-list) for
    the exact row rules); the page shows the success message and any
    warnings, and refreshes the household table below with the result.
  - **Log Out** -- revokes the session server-side; revisiting
    `/admin/guests` afterward redirects back to `/admin/login`.

---

