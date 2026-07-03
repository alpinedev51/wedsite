import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from service_wed.models.guest import Guest
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
