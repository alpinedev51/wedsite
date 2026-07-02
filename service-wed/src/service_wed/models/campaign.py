"""Campaign: a planned bulk send that fans out into email_messages rows."""

from __future__ import annotations

import datetime as dt
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from service_wed.domain.value_objects import CampaignStatus, CampaignType
from service_wed.models.base import Base, Timestamps, UUIDPrimaryKey, str_enum

if TYPE_CHECKING:
    from service_wed.models.email_message import EmailMessage


class Campaign(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "campaigns"

    type: Mapped[CampaignType] = mapped_column(str_enum(CampaignType, "campaign_type"))
    subject: Mapped[str] = mapped_column(Text)
    template_key: Mapped[str] = mapped_column(Text)
    scheduled_for: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[CampaignStatus] = mapped_column(
        str_enum(CampaignStatus, "campaign_status"),
        default=CampaignStatus.DRAFT,
        server_default=text("'draft'"),
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("admin_users.id", ondelete="SET NULL")
    )

    email_messages: Mapped[list[EmailMessage]] = relationship(back_populates="campaign")
