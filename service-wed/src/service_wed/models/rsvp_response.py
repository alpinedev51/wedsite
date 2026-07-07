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

    # RECOMMENDED (done): this used to also have a `responded_at` column,
    # server-defaulted to now() and re-bumped to now() on every
    # ON CONFLICT DO UPDATE (see adapters/repositories/rsvp.py's upsert_response).
    # It was fully redundant with what Timestamps already gives every model:
    # created_at is "first submitted," updated_at is "last changed" -- the
    # same two facts responded_at was trying to capture in one column.
    # Dropped in migration <see alembic/versions/>.
    guest_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("guests.id", ondelete="CASCADE"), unique=True
    )
    status: Mapped[RsvpStatus] = mapped_column(str_enum(RsvpStatus, "rsvp_status"))
    meal_choice: Mapped[str | None] = mapped_column(Text)
    dietary_notes: Mapped[str | None] = mapped_column(Text)

    guest: Mapped[Guest] = relationship(back_populates="rsvp_response")
