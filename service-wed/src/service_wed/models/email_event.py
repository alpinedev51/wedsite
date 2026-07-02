from __future__ import annotations

import datetime as dt
import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from service_wed.domain.value_objects import EmailEventType
from service_wed.models.base import Base, UUIDPrimaryKey, Timestamps, str_enum

if TYPE_CHECKING:
    from service_wed.models.email_message import EmailMessage


class EmailEvent(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "email_events"

    email_message_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("email_messages.id", ondelete="CASCADE"), index=True
    )
    email_event_type: Mapped[EmailEventType] = mapped_column(
        str_enum(EmailEventType, "email_event_type")
    )
    provider_event_id: Mapped[str | None] = mapped_column(Text, unique=True)
    occurred_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))
    payload: Mapped[dict[str, Any] | None] = mapped_column()

    message: Mapped[EmailMessage] = relationship(back_populates="events")
