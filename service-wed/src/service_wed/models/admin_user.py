"""AdminUser: the couple. Seeded directly; no self-service registration."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Text
from sqlalchemy.dialects.postgresql import CITEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from service_wed.models.base import Base, Timestamps, UUIDPrimaryKey

if TYPE_CHECKING:
    from service_wed.models.admin_session import AdminSession


class AdminUser(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "admin_users"

    email: Mapped[str] = mapped_column(CITEXT, unique=True)
    # Stored format is adapters/security/hasher.py's ScryptPasswordHasher
    # output ("scrypt$n$r$p$salt$hash"), not argon2 -- this comment used to
    # say argon2 from an earlier design that changed before hasher.py was
    # written (scrypt needs no extra dependency; argon2 would need
    # argon2-cffi).
    password_hash: Mapped[str] = mapped_column(Text)

    sessions: Mapped[list[AdminSession]] = relationship(
        back_populates="admin_user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
