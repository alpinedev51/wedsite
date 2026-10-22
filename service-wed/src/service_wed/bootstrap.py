from __future__ import annotations

from dataclasses import dataclass

from arq.connections import ArqRedis
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, AsyncSession

from service_wed.adapters.db import async_session_maker, engine
from service_wed.adapters.email.console import ConsoleEmailSender
from service_wed.adapters.email.resend import ResendEmailSender
from service_wed.adapters.queue import ArqQueue
from service_wed.adapters.redis import create_redis_pool
from service_wed.adapters.security.hasher import ScryptPasswordHasher
from service_wed.adapters.uow import SQLAlchemyUnitOfWork
from service_wed.config.settings import settings
from service_wed.ports.email_sender import EmailSenderPort
from service_wed.ports.password_hasher import PasswordHasherPort
from service_wed.ports.queue import QueuePort
from service_wed.ports.uow import UnitOfWorkPort
from service_wed.services.auth import AuthService
from service_wed.services.campaigns import CampaignService
from service_wed.services.dashboard import DashboardService
from service_wed.services.delivery import DeliveryService
from service_wed.services.exports import ExportService
from service_wed.services.guest_list import GuestListService
from service_wed.services.invitation_lookup import InvitationService
from service_wed.services.reminders import ReminderService
from service_wed.services.rsvp import RsvpService
from service_wed.services.wedding import WeddingService


def build_email_sender() -> EmailSenderPort:
    """Resend if an API key is configured, otherwise the console sender.
    Local dev/.env normally has no RESEND_API_KEY set, so this defaults to
    printing emails instead of failing to authenticate against Resend."""
    if settings.resend_api_key:
        return ResendEmailSender(
            api_key=settings.resend_api_key,
            from_address=settings.resend_from_address,
            max_sends_per_second=settings.resend_max_sends_per_second,
        )
    return ConsoleEmailSender()


@dataclass
class AppContainer:
    """Everything hooks/lifespan.py hangs on app.state and worker.py hangs on
    the arq ctx dict. One instance per process; every field on it is safe to
    read concurrently. Anything that needs a UnitOfWork is built fresh
    on-demand via the new_*_service() methods below, never stored here.
    """

    engine: AsyncEngine
    session_factory: async_sessionmaker[AsyncSession]
    redis: ArqRedis
    queue: QueuePort
    email_sender: EmailSenderPort
    password_hasher: PasswordHasherPort

    def new_uow(self) -> UnitOfWorkPort:
        return SQLAlchemyUnitOfWork(self.session_factory)

    def new_auth_service(self) -> AuthService:
        return AuthService(self.new_uow(), self.password_hasher)

    def new_rsvp_service(self) -> RsvpService:
        return RsvpService(self.new_uow())

    def new_guest_list_service(self) -> GuestListService:
        return GuestListService(self.new_uow())

    def new_invitation_service(self) -> InvitationService:
        return InvitationService(self.new_uow())

    def new_campaign_service(self) -> CampaignService:
        return CampaignService(self.new_uow())

    def new_delivery_service(self) -> DeliveryService:
        return DeliveryService(self.new_uow(), self.email_sender, self.queue)

    def new_reminder_service(self) -> ReminderService:
        return ReminderService(self.new_uow())

    def new_dashboard_service(self) -> DashboardService:
        return DashboardService(self.new_uow())

    def new_export_service(self) -> ExportService:
        return ExportService(self.new_uow())

    def new_wedding_service(self) -> WeddingService:
        return WeddingService(self.new_uow())

    async def close(self) -> None:
        """Release the process-wide connections. Call once on shutdown."""
        await self.redis.close()
        await self.engine.dispose()


async def build_container() -> AppContainer:
    """Build the shared, concurrency-safe adapters. Async because opening
    the Redis pool requires a round trip; the DB engine itself
    (adapters/db.py) is created lazily/sync at import time, so it's just
    reused here rather than rebuilt.
    """
    redis = await create_redis_pool()
    return AppContainer(
        engine=engine,
        session_factory=async_session_maker,
        redis=redis,
        queue=ArqQueue(redis),
        email_sender=build_email_sender(),
        password_hasher=ScryptPasswordHasher(),
    )
