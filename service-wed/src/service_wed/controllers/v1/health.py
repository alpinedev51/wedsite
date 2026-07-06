"""Liveness/readiness. Not behind auth, not versioned business logic --
just "is the process up" and "can it reach its dependencies."
"""

from fastapi import APIRouter, Response, status
from sqlalchemy import text

from service_wed.adapters.db import engine

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
    except Exception as exc:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "unavailable", "detail": str(exc)}
    return {"status": "ok"}
