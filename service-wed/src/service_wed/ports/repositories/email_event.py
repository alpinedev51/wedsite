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
    ) -> EmailEvent | None:
        """Record an asynchronous webhook event from the email provider (e.g., delivered, bounced)."""
        ...

    async def count_by_type(
        self, campaign_id: uuid.UUID | None = None
    ) -> dict[EmailEventType, int]:
        """Count recorded events grouped by type. The dashboard only reads
        bounced/complained back out of this, but returning the full
        breakdown keeps the port useful beyond that one caller. Pass
        `campaign_id` to scope to events for just one campaign's messages
        (used by the campaign detail view's own delivery breakdown) --
        events don't carry campaign_id directly, so the adapter joins
        through email_messages to filter."""
        ...
