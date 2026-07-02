from sqlalchemy.ext.asyncio import async_sessionmaker

from service_wed.ports.uow import UnitOfWorkPort


class SQLAlchemyUnitOfWork(UnitOfWorkPort):
    """
    The Adapter: Implements the transaction boundary using SQLAlchemy
    """

    def __init__(self, session_factory: async_sessionmaker):
        self.session_factory = session_factory

    async def __aenter__(self):
        self.session = self.session_factory()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            await self.rollback()
        if self.session:
            await self.session.close()
        self.session = None

    async def commit(self):
        if self.session:
            await self.session.commit()

    async def rollback(self):
        if self.session:
            await self.session.rollback()
