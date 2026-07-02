"""Declarative base, shared mixins, and small persistence helpers.

- `Base` carries a constraint/index naming convention so Alembic produces
  stable, predictable names (clean migration diffs).
- `str_enum()` maps a Python StrEnum to a VARCHAR + CHECK (no native PG ENUM
  type), so changing a value is an ordinary migration, not ALTER TYPE.
"""

from __future__ import annotations

import datetime as dt
import uuid
from enum import StrEnum
from typing import Any

from sqlalchemy import DateTime, Enum, MetaData, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


# Stable names for indexes/constraints -> deterministic Alembic autogenerate.
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


def str_enum(enum_cls: type[StrEnum], name: str) -> Enum:
    """VARCHAR column with a CHECK (col IN (...)) generated from the enum values.

    Round-trips to the Python enum but avoids native PG ENUM types: adding or
    changing a value is a plain CHECK migration, never ALTER TYPE ADD VALUE
    """
    return Enum(
        enum_cls,
        name=name,
        native_enum=False,
        create_constraint=True,
        values_callable=lambda e: [member.value for member in e],
    )


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)

    type_annotation_map = {
        dict[str, Any]: JSONB,
    }


class UUIDPrimaryKey:
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)


class Timestamps:
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
