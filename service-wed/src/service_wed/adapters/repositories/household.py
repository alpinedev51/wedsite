import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from service_wed.models.household import Household
from service_wed.models.guest import Guest
from service_wed.models.rsvp_response import RsvpResponse
from service_wed.ports.repositories.household import HouseholdRepository

# Shared eager-load option: Household.guests, and each guest's rsvp_response.
# Guest.rsvp_status/.meal_choice (models/guest.py) are plain Python
# properties that read guest.rsvp_response -- under the async ORM, touching
# an unloaded relationship outside an `await` raises MissingGreenlet instead
# of lazy-loading it, so anywhere a Household is serialized through a schema
# that reads those properties (InvitationResponse, HouseholdAdminView) needs
# rsvp_response eagerly loaded up front, not just guests.
_WITH_GUESTS_AND_RSVPS = selectinload(Household.guests).selectinload(
    Guest.rsvp_response
)


class SQLAlchemyHouseholdRepository(HouseholdRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self, display_name: str, contact_email: str | None, invite_token: str
    ) -> Household:
        household = Household(
            display_name=display_name,
            contact_email=contact_email,
            invite_token=invite_token,
        )
        self.session.add(household)
        await self.session.flush()
        return household

    async def get_by_invite_token(self, token: str) -> Household | None:
        stmt = (
            select(Household)
            .where(Household.invite_token == token)
            .options(_WITH_GUESTS_AND_RSVPS)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_email(self, email: str) -> list[Household]:
        stmt = (
            select(Household)
            .where(Household.contact_email == email)
            .options(_WITH_GUESTS_AND_RSVPS)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_display_name(self, display_name: str) -> Household | None:
        stmt = (
            select(Household)
            .where(func.lower(Household.display_name) == display_name.strip().lower())
            .options(_WITH_GUESTS_AND_RSVPS)
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_by_id(self, household_id: uuid.UUID) -> Household | None:
        stmt = (
            select(Household)
            .where(Household.id == household_id)
            .options(_WITH_GUESTS_AND_RSVPS)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_all(self) -> list[Household]:
        stmt = select(Household)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_non_responding(self) -> list[Household]:
        stmt = (
            select(Household)
            .join(Household.guests)
            .join(Guest.rsvp_response, isouter=True)
            .where(RsvpResponse.id.is_(None))
            .distinct()
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_paginated(
        self, limit: int, offset: int
    ) -> tuple[list[Household], int]:
        total = (
            await self.session.execute(select(func.count()).select_from(Household))
        ).scalar_one()

        stmt = (
            select(Household)
            .options(_WITH_GUESTS_AND_RSVPS)
            .order_by(Household.display_name)
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all()), total

    async def list_all_with_guests(self) -> list[Household]:
        stmt = (
            select(Household)
            .options(_WITH_GUESTS_AND_RSVPS)
            .order_by(Household.display_name)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_summary(self) -> tuple[int, int]:
        # FILTER (WHERE ...) alongside a plain count() in one query, rather
        # than two round trips or loading every row into Python to count them.
        stmt = select(
            func.count(),
            func.count().filter(Household.rsvp_submitted_at.is_not(None)),
        ).select_from(Household)
        result = await self.session.execute(stmt)
        total, responded = result.one()
        return total, responded
