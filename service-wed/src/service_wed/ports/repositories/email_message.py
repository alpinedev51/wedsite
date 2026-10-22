import datetime as dt
import uuid
from typing import Protocol, NamedTuple

from service_wed.domain.value_objects import (
    EmailStatus,
)
from service_wed.models.email_message import EmailMessage


class ReminderStats(NamedTuple):
    reminder_count: int
    last_scheduled_for: dt.datetime | None


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

    async def reschedule(
        self, message_id: uuid.UUID, scheduled_for: dt.datetime, last_error: str
    ) -> None:
        """Put a message back to SCHEDULED for a later send (attempts
        unchanged): dispatch_due_emails claims it again once it's due. Also
        records send_blocked_since, the first time this happened."""
        ...

    async def get_by_provider_message_id(
        self, provider_message_id: str
    ) -> EmailMessage | None:
        """Look up the message a webhook event refers to."""
        ...

    # Added for tasks/send.py: the arq job body only receives message_id
    # (arq serializes job args to Redis, so it can't hold a live ORM object
    # across the enqueue), so it needs a way to load the row back.
    async def get_by_id(self, message_id: uuid.UUID) -> EmailMessage | None:
        """Fetch a single email message by id."""
        ...

    async def get_reminder_stats(
        self, household_ids: list[uuid.UUID]
    ) -> dict[uuid.UUID, ReminderStats]:
        """For each of the given households, how many REMINDER messages
        count toward its cap, and when the most recent one was scheduled.
        Canceled reminders, and failed ones the provider never accepted,
        don't count."""
        ...

    async def get_invitation_sent_at(
        self, household_ids: list[uuid.UUID]
    ) -> dict[uuid.UUID, dt.datetime]:
        """For each of the given households that has been sent an RSVP
        invitation, when the most recent one went out. Households with no
        successfully sent invitation are absent from the result."""
        ...

    async def count_by_status(
        self, campaign_id: uuid.UUID | None = None
    ) -> dict[EmailStatus, int]:
        """Count email_messages grouped by status -- backs the admin
        dashboard's delivery breakdown. Pass `campaign_id` to scope the count
        to one campaign's fanned-out messages instead of every message ever
        sent (used by the campaign detail view's own delivery breakdown)."""
        ...
