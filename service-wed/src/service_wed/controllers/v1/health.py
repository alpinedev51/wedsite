"""Liveness/readiness. Not behind auth, not versioned business logic --
just "is the process up" and "can it reach its dependencies."
"""

import asyncio
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import text

from service_wed.adapters.db import engine
from service_wed.bootstrap import AppContainer
from service_wed.dependencies import get_container

logger = logging.getLogger("service_wed.health")

router = APIRouter(tags=["health"])


@router.get("/live")
async def liveness() -> dict[str, str]:
    """Process is up and serving requests. Never checks the DB -- a slow DB
    shouldn't make an orchestrator think the process itself is dead."""
    return {"status": "ok"}


@router.get("/ready")
async def readiness(response: Response) -> dict[str, str]:
    """Can this instance actually serve traffic right now. Runs a trivial
    query so a dead DB connection shows up here as a 503 instead of as a 500
    on some real user-facing request."""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        # The error goes to the logs, not the response: this endpoint is
        # public, and DB driver errors can include hostnames/usernames.
        logger.exception("Readiness check failed: database unreachable")
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "unavailable"}
    return {"status": "ok"}


@router.get("/worker")
async def worker_health(
    response: Response,
    container: Annotated[AppContainer, Depends(get_container)],
) -> dict[str, str]:
    """Is the background worker (which sends every email) alive. For an
    uptime monitor: without this, a crashed worker means emails silently
    stop while the site itself stays up."""
    try:
        # Bounded: a Redis that accepts connections but never answers would
        # otherwise hang this request instead of reporting 503.
        alive = await asyncio.wait_for(container.queue.worker_alive(), timeout=2)
    except Exception:
        logger.exception("Worker health check failed: queue unreachable")
        alive = False
    if not alive:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "unavailable"}
    return {"status": "ok"}
