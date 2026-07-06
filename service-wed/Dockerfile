# Multi-stage production-grade Dockerfile for service-wed FastAPI backend
FROM python:3.14-slim AS builder

# Install uv for extremely fast and reliable dependency caching/installation
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1

# Copy only dependency definitions to leverage Docker layer caching
COPY pyproject.toml uv.lock ./

# Install dependencies (exclude project source itself for caching)
RUN --mount=type=cache,target=/root/.cache/uv \
	uv sync --frozen --no-install-project --no-dev

# Copy package source code and sync to install the project
COPY src ./src
COPY README.md ./
RUN --mount=type=cache,target=/root/.cache/uv \
	uv sync --frozen --no-dev


FROM python:3.14-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
	&& rm -rf /var/lib/apt/lists/*

# Run as a non-root user for security hardening
RUN groupadd -r wed && useradd -r -g wed wed

WORKDIR /app

# Copy virtual environment and installed sources from builder stage
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/src /app/src
COPY alembic /app/alembic
COPY alembic.ini /app/alembic.ini

# Fix file ownership
RUN chown -R wed:wed /app

# Configure environmental path and flags
ENV PATH="/app/.venv/bin:$PATH" \
	PYTHONUNBUFFERED=1 \
	PYTHONDONTWRITEBYTECODE=1 \
	PYTHONPATH="/app/src"

EXPOSE 8000

USER wed

CMD ["uvicorn", "service_wed.main:app", "--host", "0.0.0.0", "--port", "8000"]
