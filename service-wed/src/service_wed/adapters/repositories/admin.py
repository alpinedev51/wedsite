import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from service_wed.models.admin_user import AdminUser
from service_wed.ports.repositories.admin import (
    AdminUserRepository,
)


class SQLAlchemyAdminUserRepository(AdminUserRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, admin_id: uuid.UUID) -> AdminUser | None:
        result = await self.session.execute(
            select(AdminUser).where(AdminUser.id == admin_id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> AdminUser | None:
        result = await self.session.execute(
            select(AdminUser).where(AdminUser.email == email)
        )
        return result.scalar_one_or_none()
