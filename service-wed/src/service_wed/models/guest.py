"""Guest: a person within a household."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Text, text
from sqlalchemy.dialects.postgresql import CITEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from service_wed.domain.value_objects import RsvpStatus
from service_wed.models.base import Base, Timestamps, UUIDPrimaryKey

if TYPE_CHECKING:
    from service_wed.models.household import Household
    from service_wed.models.rsvp_response import RsvpResponse


class Guest(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "guests"

    household_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("households.id", ondelete="CASCADE"), index=True
    )
    full_name: Mapped[str] = mapped_column(Text)
    email: Mapped[str | None] = mapped_column(CITEXT)
    is_plus_one: Mapped[bool] = mapped_column(
        default=False, server_default=text("false")
    )

    # "Find your invitation" name search uses a plain ILIKE; at a few hundred
    # rows no pg_trgm extension or GIN index is warranted.

    household: Mapped[Household] = relationship(back_populates="guests")
    rsvp_response: Mapped[RsvpResponse | None] = relationship(
        back_populates="guest",
        cascade="all, delete-orphan",
        passive_deletes=True,
        uselist=False,
    )

    @property
    def rsvp_status(self) -> RsvpStatus | None:
        return self.rsvp_response.status if self.rsvp_response else None

    @property
    def meal_choice(self) -> str | None:
        return self.rsvp_response.meal_choice if self.rsvp_response else None

    @property
    def dietary_notes(self) -> str | None:
        return self.rsvp_response.dietary_notes if self.rsvp_response else None
