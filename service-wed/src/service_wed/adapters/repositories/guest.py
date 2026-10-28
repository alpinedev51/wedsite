import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from service_wed.domain.value_objects import RsvpStatus
from service_wed.models.guest import Guest
from service_wed.models.rsvp_response import RsvpResponse
from service_wed.ports.repositories.guest import GuestRepository


class SQLAlchemyGuestRepository(GuestRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        household_id: uuid.UUID,
        full_name: str,
        email: str | None,
        is_plus_one: bool,
    ) -> Guest:
        guest = Guest(
            household_id=household_id,
            full_name=full_name,
            email=email,
            is_plus_one=is_plus_one,
        )
        self.session.add(guest)
        await self.session.flush()
        return guest

    async def delete(self, guest: Guest) -> None:
        # The ORM cascade removes a loaded rsvp_response too; the database
        # cascade covers one that isn't loaded. email_messages.guest_id is
        # SET NULL, so past emails are kept.
        await self.session.delete(guest)
        await self.session.flush()

    async def count_by_rsvp_status(self) -> dict[RsvpStatus | None, int]:
        # LEFT JOIN so guests with no RsvpResponse row still get counted --
        # grouping over a nullable joined column puts them under a None key.
        stmt = (
            select(RsvpResponse.status, func.count(Guest.id))
            .select_from(Guest)
            .join(Guest.rsvp_response, isouter=True)
            .group_by(RsvpResponse.status)
        )
        result = await self.session.execute(stmt)
        return {status: count for status, count in result.all()}
