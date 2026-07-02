"""AdminSession: server-side, revocable session. The cookie holds the raw
token; we store only its hash and verify against it."""

from __future__ import annotations

import datetime as dt
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from service_wed.models.base import Base, Timestamps, UUIDPrimaryKey

if TYPE_CHECKING:
    from service_wed.models.admin_user import AdminUser


class AdminSession(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "admin_sessions"

    admin_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("admin_users.id", ondelete="CASCADE")
    )
    token_hash: Mapped[str] = mapped_column(Text, unique=True)
    expires_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), index=True)
    revoked_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))

    admin_user: Mapped[AdminUser] = relationship(back_populates="sessions")
