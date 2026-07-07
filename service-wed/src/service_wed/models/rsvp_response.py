from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from service_wed.domain.value_objects import RsvpStatus
from service_wed.models.base import UUIDPrimaryKey, Timestamps, Base, str_enum

if TYPE_CHECKING:
    from service_wed.models.guest import Guest


class RsvpResponse(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "rsvp_responses"

    guest_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("guests.id", ondelete="CASCADE"), unique=True
    )
    status: Mapped[RsvpStatus] = mapped_column(str_enum(RsvpStatus, "rsvp_status"))
    meal_choice: Mapped[str | None] = mapped_column(Text)
    dietary_notes: Mapped[str | None] = mapped_column(Text)

    guest: Mapped[Guest] = relationship(back_populates="rsvp_response")
