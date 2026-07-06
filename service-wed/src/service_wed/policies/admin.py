"""require_admin: verifies the session cookie names a live, unexpired,
unrevoked AdminSession and returns the AdminUser it belongs to. Every
admin-only route (campaigns, households, dashboard, exports) depends on
this -- see controllers/v1/*.py.
"""

from __future__ import annotations

import datetime as dt
import hashlib
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status

from service_wed.bootstrap import AppContainer
from service_wed.config.settings import settings
from service_wed.dependencies import get_container
from service_wed.models.admin_user import AdminUser


async def require_admin(
    request: Request,
    container: Annotated[AppContainer, Depends(get_container)],
) -> AdminUser:
    raw_token = request.cookies.get(settings.session_cookie_name)
    if raw_token is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated.")

    # Same hash AuthService.login() stores (sha256 of the raw cookie value) --
    # the DB only ever holds the hash, so a DB leak alone can't replay a
    # session; you'd also need the raw cookie value.
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    # A fresh UnitOfWork per call, not a shared one off the container --
    # see bootstrap.py's module docstring for why sharing one would corrupt
    # concurrent requests' sessions.
    uow = container.new_uow()
    async with uow:
        session = await uow.admin_session_repo.get_by_token_hash(token_hash)
        if session is None:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid session.")

        now = dt.datetime.now(dt.timezone.utc)
        if session.revoked_at is not None or session.expires_at <= now:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired.")

        admin = await uow.admin_user_repo.get_by_id(session.admin_user_id)
        if admin is None:
            # Session outlived its AdminUser (e.g. manually deleted from the
            # DB). Treat it the same as any other invalid session.
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid session.")

        return admin
