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

