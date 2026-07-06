import uuid
from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from service_wed.domain.value_objects import EmailStatus, EmailType
from service_wed.models.email_message import EmailMessage
from service_wed.ports.repositories.email_message import (
    EmailMessageRepository,
    ReminderStats,
)


class SQLAlchemyEmailMessageRepository(EmailMessageRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_batch(self, messages: list[EmailMessage]) -> None:
        self.session.add_all(messages)
        await self.session.flush()

    async def claim_due(self, limit: int = 100) -> list[EmailMessage]:
        """WITH claimed AS (
               SELECT id FROM email_messages
               WHERE status = 'scheduled' AND scheduled_for <= now()
               ORDER BY scheduled_for LIMIT :limit
               FOR UPDATE SKIP LOCKED
           )
           UPDATE email_messages SET status = 'sending'
           WHERE id IN (SELECT id FROM claimed)
           RETURNING *;

        One statement -> no gap between selecting due rows and locking them
        for a concurrent claim to race into.
        """
        claimed_ids = (
            select(EmailMessage.id)
            .where(
                EmailMessage.status == EmailStatus.SCHEDULED,
                EmailMessage.scheduled_for <= func.now(),
            )
            .order_by(EmailMessage.scheduled_for)
            .limit(limit)
            .with_for_update(skip_locked=True)
            .cte("claimed")
        )
        stmt = (
            update(EmailMessage)
            .where(EmailMessage.id.in_(select(claimed_ids.c.id)))
            .values(status=EmailStatus.SENDING)
            .returning(EmailMessage)
        )
        result = await self.session.execute(
            stmt, execution_options={"populate_existing": True}
        )
        return list(result.scalars().all())

    async def update_status(
        self,
        message_id: uuid.UUID,
        status: EmailStatus,
        provider_message_id: str | None = None,
        last_error: str | None = None,
        increment_attempts: bool = False,
    ) -> None:
        update_values: dict[str, Any] = {
            "status": status,
        }
        if provider_message_id is not None:
            update_values["provider_message_id"] = provider_message_id
        if last_error is not None:
            update_values["last_error"] = last_error
        if status == EmailStatus.SENT:
            update_values["sent_at"] = func.now()

        stmt = (
            update(EmailMessage)
            .where(EmailMessage.id == message_id)
            .values(**update_values)
        )

        if increment_attempts:
            stmt = stmt.values(attempts=EmailMessage.attempts + 1)

        await self.session.execute(stmt)

    async def get_by_provider_message_id(
        self, provider_message_id: str
    ) -> EmailMessage | None:
        stmt = select(EmailMessage).where(
            EmailMessage.provider_message_id == provider_message_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id(self, message_id: uuid.UUID) -> EmailMessage | None:
        result = await self.session.execute(
            select(EmailMessage).where(EmailMessage.id == message_id)
        )
        return result.scalar_one_or_none()

    async def get_reminder_stats(
        self, household_ids: list[uuid.UUID]
    ) -> dict[uuid.UUID, ReminderStats]:
        if not household_ids:
            return {}

        stmt = (
            select(
                EmailMessage.household_id,
                func.count(EmailMessage.id),
                func.max(EmailMessage.scheduled_for),
            )
            .where(
                EmailMessage.household_id.in_(household_ids),
                EmailMessage.email_type == EmailType.REMINDER,
                EmailMessage.status != EmailStatus.CANCELED,
            )
            .group_by(EmailMessage.household_id)
        )
        result = await self.session.execute(stmt)
        return {
            household_id: ReminderStats(
                reminder_count=reminder_count, last_scheduled_for=last_scheduled_for
            )
            for household_id, reminder_count, last_scheduled_for in result.all()
        }
