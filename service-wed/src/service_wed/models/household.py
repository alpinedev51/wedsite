"""Household: the invitation unit and owner of the magic-link token."""

from __future__ import annotations

import datetime as dt
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, SmallInteger, Text, text
from sqlalchemy.dialects.postgresql import CITEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from service_wed.models.base import Base, Timestamps, UUIDPrimaryKey

if TYPE_CHECKING:
    from service_wed.models.email_message import EmailMessage
    from service_wed.models.guest import Guest


class Household(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "households"

    display_name: Mapped[str] = mapped_column(Text)
    contact_email: Mapped[str | None] = mapped_column(CITEXT, index=True)

    invite_token: Mapped[str] = mapped_column(Text, unique=True)

    plus_ones_allowed: Mapped[int] = mapped_column(
        SmallInteger, default=0, server_default=text("0")
    )

    # Household-level RSVP extras. rsvp_submitted_at/updated_at are a deliberate
    # denormalization: an aggregate over the guests' responses, read on every
    # Find-Your-Invitation / dashboard hit.
    song_request: Mapped[str | None] = mapped_column(Text)
    message_to_couple: Mapped[str | None] = mapped_column(Text)

    rsvp_submitted_at: Mapped[dt.datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    rsvp_updated_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))

    guests: Mapped[list[Guest]] = relationship(
        back_populates="household",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    email_messages: Mapped[list[EmailMessage]] = relationship(
        back_populates="household",
    )
