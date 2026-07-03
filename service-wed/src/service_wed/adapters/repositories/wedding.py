from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from service_wed.models.wedding import WEDDING_ID, Wedding
from service_wed.ports.repositories.wedding import WeddingRepository


class SQLAlchemyWeddingRepository(WeddingRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self) -> Wedding | None:
        result = await self.session.execute(
            select(Wedding).where(Wedding.id == WEDDING_ID)
        )
        return result.scalar_one_or_none()
