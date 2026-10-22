# Multi-stage production-grade Dockerfile for service-wed FastAPI backend
FROM python:3.14.7-slim AS builder

# Install uv for extremely fast and reliable dependency caching/installation
COPY --from=ghcr.io/astral-sh/uv:0.13.4 /uv /uvx /bin/

WORKDIR /app

# Enable bytecode compilation. Link mode copy: the uv cache is a separate
# cache mount, so hardlinks into the venv always fail (uv warns, then copies).
ENV UV_COMPILE_BYTECODE=1 \
	UV_LINK_MODE=copy

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


FROM python:3.14.7-slim AS runner

# Run as a non-root user for security hardening
RUN groupadd -r wed && useradd -r -g wed wed

WORKDIR /app

# Copy virtual environment and installed sources from builder stage
# --chown at copy time instead of a separate `RUN chown -R`, which would
# duplicate every file into another image layer just to change its owner.
COPY --from=builder --chown=wed:wed /app/.venv /app/.venv
COPY --from=builder --chown=wed:wed /app/src /app/src
COPY --chown=wed:wed alembic /app/alembic
COPY --chown=wed:wed alembic.ini /app/alembic.ini

# Configure environmental path and flags
ENV PATH="/app/.venv/bin:$PATH" \
	PYTHONUNBUFFERED=1 \
	PYTHONDONTWRITEBYTECODE=1 \
	PYTHONPATH="/app/src"

EXPOSE 8000

USER wed

CMD ["uvicorn", "service_wed.main:app", "--host", "0.0.0.0", "--port", "8000"]
