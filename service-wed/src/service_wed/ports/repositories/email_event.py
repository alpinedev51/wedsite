import datetime as dt
import uuid
from typing import Any, Protocol

from service_wed.domain.value_objects import (
    EmailEventType,
)
from service_wed.models.email_event import EmailEvent


class EmailEventRepository(Protocol):
    """Port defining webhook event data access."""

    async def create(
        self,
        email_message_id: uuid.UUID,
        event_type: EmailEventType,
        provider_event_id: str,
        occurred_at: dt.datetime,
        payload: dict[str, Any] | None = None,
    ) -> EmailEvent:
        """Record an asynchronous webhook event from the email provider (e.g., delivered, bounced)."""
        ...
