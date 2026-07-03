import uuid
from typing import Protocol

from service_wed.domain.value_objects import (
    EmailStatus,
)
from service_wed.models.email_message import EmailMessage


class EmailMessageRepository(Protocol):
    """Port defining email message data access."""

    async def create_batch(self, messages: list[EmailMessage]) -> None:
        """Bulk insert email messages (fan-out from a scheduled campaign)."""
        ...

    async def claim_due(self, limit: int = 100) -> list[EmailMessage]:
        """Atomically claim up to `limit` due messages: select FOR UPDATE SKIP
        LOCKED, flip status scheduled->sending, return the claimed rows.
        """
        ...

    async def update_status(
        self,
        message_id: uuid.UUID,
        status: EmailStatus,
        provider_message_id: str | None = None,
        last_error: str | None = None,
        increment_attempts: bool = False,
    ) -> None:
        """Update message state after a send attempt."""
        ...
