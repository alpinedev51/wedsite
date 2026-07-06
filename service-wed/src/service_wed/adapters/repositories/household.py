from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from service_wed.models.household import Household
from service_wed.models.guest import Guest
from service_wed.models.rsvp_response import RsvpResponse
from service_wed.ports.repositories.household import HouseholdRepository


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
            .options(selectinload(Household.guests))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Household | None:
        stmt = (
            select(Household)
            .where(Household.contact_email == email)
            .options(selectinload(Household.guests))
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
