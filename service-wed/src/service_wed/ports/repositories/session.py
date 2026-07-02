from typing import Protocol

import datetime as dt
import uuid

from service_wed.models.admin_session import AdminSession


class AdminSessionRepository(Protocol):
    """Port defining admin session data access."""

    async def create(
        self, admin_id: uuid.UUID, token_hash: str, expires_at: dt.datetime
    ) -> AdminSession:
        """Create a new revocable session."""
        ...

    async def get_by_token_hash(self, token_hash: str) -> AdminSession | None:
        """Fetch a session to validate an incoming API request."""
        ...

    async def revoke(self, session_id: uuid.UUID) -> None:
        """Mark a session as revoked (logout or forced invalidation)."""
        ...
