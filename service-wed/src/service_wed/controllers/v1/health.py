"""Liveness/readiness. Not behind auth, not versioned business logic --
just "is the process up" and "can it reach its dependencies."
"""

import logging

from fastapi import APIRouter, Response, status
from sqlalchemy import text

from service_wed.adapters.db import engine

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
