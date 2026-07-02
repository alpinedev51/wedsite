import datetime as dt
import uuid

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from service_wed.models.admin_session import AdminSession
from service_wed.ports.repositories.session import (
    AdminSessionRepository,
)


class SQLAlchemyAdminSessionRepository(AdminSessionRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self, admin_id: uuid.UUID, token_hash: str, expires_at: dt.datetime
    ) -> AdminSession:
        session_obj = AdminSession(
            admin_user_id=admin_id, token_hash=token_hash, expires_at=expires_at
        )
        self.session.add(session_obj)
        await self.session.flush()
        return session_obj

    async def get_by_token_hash(self, token_hash: str) -> AdminSession | None:
        result = await self.session.execute(
            select(AdminSession).where(AdminSession.token_hash == token_hash)
        )
        return result.scalar_one_or_none()

    async def revoke(self, session_id: uuid.UUID) -> None:
        await self.session.execute(
            update(AdminSession)
            .where(AdminSession.id == session_id)
            .values(revoked_at=func.now())
        )
