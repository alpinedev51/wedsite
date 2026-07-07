# pagination, error envelope, shared types
import uuid
from typing import Generic, TypeVar

from pydantic import BaseModel


class SuccessResponse(BaseModel):
    success: bool = True
    message: str | None = None


class IdResponse(BaseModel):
    id: uuid.UUID


T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    """Generic offset/limit page envelope for admin list endpoints.

    `total` is the full row count regardless of `limit`/`offset`, so the
    frontend can render "23 of 140" / compute page count without a second
    request. Offset/limit (not a cursor) is deliberate: this is an admin
    dashboard over a few hundred rows at most, not a feed that needs
    cursor-stable pagination under high write concurrency.
    """

    items: list[T]
    total: int
    limit: int
    offset: int
