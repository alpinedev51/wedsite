"""Singleton configuration row that drives time-based policies.

The id is fixed to a known constant: the app always upserts WEDDING_ID, and a
second insert simply conflicts on the primary key. No extra constraint needed.
"""

from __future__ import annotations

import datetime as dt
import uuid

from sqlalchemy import DateTime, SmallInteger, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from service_wed.models.base import Base, Timestamps

WEDDING_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


class Wedding(Timestamps, Base):
    __tablename__ = "wedding"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=WEDDING_ID)

    wedding_date: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))
    rsvp_opens_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    rsvp_deadline: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True))

    reminder_cap: Mapped[int] = mapped_column(
        SmallInteger, default=2, server_default=text("2")
    )
    reminder_interval_days: Mapped[int] = mapped_column(
        SmallInteger, default=7, server_default=text("7")
    )

    venue_name: Mapped[str | None] = mapped_column(Text)
    venue_address: Mapped[str | None] = mapped_column(Text)
    venue_city: Mapped[str | None] = mapped_column(Text)

    bride_first_name: Mapped[str | None] = mapped_column(Text)
    groom_first_name: Mapped[str | None] = mapped_column(Text)
