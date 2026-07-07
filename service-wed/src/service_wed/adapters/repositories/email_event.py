import datetime as dt
import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from service_wed.domain.value_objects import EmailEventType
from service_wed.models.email_event import EmailEvent
from service_wed.models.email_message import EmailMessage
from service_wed.ports.repositories.email_event import (
    EmailEventRepository,
)


class SQLAlchemyEmailEventRepository(EmailEventRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        email_message_id: uuid.UUID,
        event_type: EmailEventType,
        provider_event_id: str,
        occurred_at: dt.datetime,
        payload: dict[str, Any] | None = None,
    ) -> EmailEvent | None:

        stmt = (
            insert(EmailEvent)
            .values(
                email_message_id=email_message_id,
                email_event_type=event_type,
                provider_event_id=provider_event_id,
                occurred_at=occurred_at,
                payload=payload,
            )
            .on_conflict_do_nothing(index_elements=["provider_event_id"])
            .returning(EmailEvent)
        )

        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def count_by_type(
        self, campaign_id: uuid.UUID | None = None
    ) -> dict[EmailEventType, int]:
        stmt = select(EmailEvent.email_event_type, func.count()).group_by(
            EmailEvent.email_event_type
        )
        # EmailEvent only has email_message_id, not campaign_id -- join
        # through EmailMessage to scope the count to one campaign's events.
        if campaign_id is not None:
            stmt = stmt.join(
                EmailMessage, EmailEvent.email_message_id == EmailMessage.id
            ).where(EmailMessage.campaign_id == campaign_id)
        result = await self.session.execute(stmt)
        return {event_type: count for event_type, count in result.all()}
