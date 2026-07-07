"""WeddingService: read/write the couple's single wedding-configuration row.

Two read paths (get_public/get_admin) rather than one, even though they're
almost the same query: the public one is what the unauthenticated frontend
gets, and deliberately can't leak the reminder-cadence fields the admin view
includes -- see WeddingPublicView/WeddingAdminView's docstrings.
"""

from __future__ import annotations

from service_wed.domain.errors import NotFoundError
from service_wed.ports.uow import UnitOfWorkPort
from service_wed.schemas.wedding import (
    WeddingAdminView,
    WeddingPublicView,
    WeddingUpsertRequest,
)

_NOT_CONFIGURED_MESSAGE = "Wedding details have not been configured yet."


class WeddingService:
    def __init__(self, uow: UnitOfWorkPort) -> None:
        self.uow = uow

    async def get_public(self) -> WeddingPublicView:
        async with self.uow:
            wedding = await self.uow.wedding_repo.get()
            if wedding is None:
                raise NotFoundError(_NOT_CONFIGURED_MESSAGE)
            return WeddingPublicView.model_validate(wedding)

    async def get_admin(self) -> WeddingAdminView:
        async with self.uow:
            wedding = await self.uow.wedding_repo.get()
            if wedding is None:
                raise NotFoundError(_NOT_CONFIGURED_MESSAGE)
            return WeddingAdminView.model_validate(wedding)

    async def upsert(self, request: WeddingUpsertRequest) -> WeddingAdminView:
        async with self.uow:
            wedding = await self.uow.wedding_repo.upsert(
                wedding_date=request.wedding_date,
                rsvp_deadline=request.rsvp_deadline,
                rsvp_opens_at=request.rsvp_opens_at,
                reminder_cap=request.reminder_cap,
                reminder_interval_days=request.reminder_interval_days,
                venue_name=request.venue_name,
                venue_address=request.venue_address,
            )
            await self.uow.commit()
            return WeddingAdminView.model_validate(wedding)
