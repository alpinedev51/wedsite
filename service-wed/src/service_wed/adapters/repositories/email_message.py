import uuid
from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from service_wed.domain.value_objects import EmailStatus
from service_wed.models.email_message import EmailMessage
from service_wed.ports.repositories.email_message import (
    EmailMessageRepository,
)


class SQLAlchemyEmailMessageRepository(EmailMessageRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_batch(self, messages: list[EmailMessage]) -> None:
        self.session.add_all(messages)
        await self.session.flush()

    async def get_pending(self, limit: int = 100) -> list[EmailMessage]:
        stmt = (
            select(EmailMessage)
            .where(
                EmailMessage.status == EmailStatus.SCHEDULED,
                EmailMessage.scheduled_for <= func.now(),
            )
            .limit(limit)
            # You might want to add .with_for_update(skip_locked=True) here later
            # if you scale to multiple worker processes!
        )
        result = await self.session.execute(stmt)
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
