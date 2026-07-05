from __future__ import annotations

import datetime as dt
import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Index, SmallInteger, Text, text
from sqlalchemy.dialects.postgresql import CITEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from service_wed.domain.value_objects import EmailStatus, EmailType
from service_wed.models.base import Base, Timestamps, UUIDPrimaryKey, str_enum

if TYPE_CHECKING:
    from service_wed.models.campaign import Campaign
    from service_wed.models.household import Household
    from service_wed.models.email_event import EmailEvent
    from service_wed.models.guest import Guest


class EmailMessage(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "email_messages"

    campaign_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("campaigns.id", ondelete="SET NULL")
    )
    household_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("households.id", ondelete="RESTRICT")
    )
    guest_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("guests.id", ondelete="SET NULL")
    )

    email_type: Mapped[EmailType] = mapped_column(str_enum(EmailType, "email_type"))
    recipient: Mapped[str] = mapped_column(CITEXT)
    subject: Mapped[str] = mapped_column(Text)
    template_key: Mapped[str] = mapped_column(Text)
    context: Mapped[dict[str, Any] | None] = mapped_column()  # -> JSONB via type map

    status: Mapped[EmailStatus] = mapped_column(
        str_enum(EmailStatus, "email_status"),
        default=EmailStatus.SCHEDULED,
        server_default=text("'scheduled'"),
    )
    scheduled_for: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))
    idempotency_key: Mapped[str] = mapped_column(Text, unique=True)

    provider_message_id: Mapped[str | None] = mapped_column(Text)
    attempts: Mapped[int] = mapped_column(
        SmallInteger, default=0, server_default=text("0")
    )
    last_error: Mapped[str | None] = mapped_column(Text)
    sent_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))

    campaign: Mapped[Campaign | None] = relationship(back_populates="email_messages")
    household: Mapped[Household] = relationship(
        back_populates="email_messages",
    )
    events: Mapped[list[EmailEvent]] = relationship(
        back_populates="message", cascade="all, delete-orphan", passive_deletes=True
    )
    guest: Mapped[Guest | None] = relationship()
    __table_args__ = (
        Index(
            "uq_email_messages_campaign_household",
            "campaign_id",
            "household_id",
            unique=True,
            postgresql_where=text("campaign_id IS NOT NULL"),
        ),
    )
