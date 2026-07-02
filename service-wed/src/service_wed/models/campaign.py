from __future__ import annotations

from typing import TYPE_CHECKING


from service_wed.models.base import UUIDPrimaryKey, Timestamps, Base

if TYPE_CHECKING:
    pass


class Campaign(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "campaigns"
