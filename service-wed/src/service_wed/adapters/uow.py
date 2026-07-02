from sqlalchemy.ext.asyncio import async_sessionmaker

from service_wed.adapters.repositories.guest import SQLAlchemyGuestRepository
from service_wed.ports.uow import UnitOfWorkPort

from service_wed.adapters.repositories.admin import SQLAlchemyAdminUserRepository
from service_wed.adapters.repositories.session import SQLAlchemyAdminSessionRepository
from service_wed.adapters.repositories.campaign import SQLAlchemyCampaignRepository
from service_wed.adapters.repositories.email_event import SQLAlchemyEmailEventRepository
from service_wed.adapters.repositories.email_message import (
    SQLAlchemyEmailMessageRepository,
)
from service_wed.adapters.repositories.household import SQLAlchemyHouseholdRepository
from service_wed.adapters.repositories.rsvp import SQLAlchemyRsvpRepository


class SQLAlchemyUnitOfWork(UnitOfWorkPort):
    """
    The Adapter: Implements the transaction boundary using SQLAlchemy
    """

    def __init__(self, session_factory: async_sessionmaker):
        self.session_factory = session_factory

    async def __aenter__(self):
        self.session = self.session_factory()

        # Instantiate repositories with the active session
        self.email_message_repo = SQLAlchemyEmailMessageRepository(self.session)
        self.email_event_repo = SQLAlchemyEmailEventRepository(self.session)
        self.admin_user_repo = SQLAlchemyAdminUserRepository(self.session)
        self.admin_session_repo = SQLAlchemyAdminSessionRepository(self.session)
        self.household_repo = SQLAlchemyHouseholdRepository(self.session)
        self.rsvp_repo = SQLAlchemyRsvpRepository(self.session)
        self.campaign_repo = SQLAlchemyCampaignRepository(self.session)
        self.guest_repo = SQLAlchemyGuestRepository(self.session)

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
