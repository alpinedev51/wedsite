# UnitOfWorkPort (transaction boundary; enables outbox)
from typing import Protocol

from service_wed.ports.repositories.email_message import EmailMessageRepository
from service_wed.ports.repositories.email_event import EmailEventRepository
from service_wed.ports.repositories.admin import AdminUserRepository
from service_wed.ports.repositories.session import AdminSessionRepository
from service_wed.ports.repositories.campaign import CampaignRepository
from service_wed.ports.repositories.household import HouseholdRepository
from service_wed.ports.repositories.rsvp import RsvpRepository

class UnitOfWorkPort(Protocol):
    email_message_repo: EmailMessageRepository
    email_event_repo: EmailEventRepository
    admin_user_repo: AdminUserRepository
    admin_session_repo: AdminSessionRepository
    household_repo: HouseholdRepository
    rsvp_repo: RsvpRepository
    campaign_repo: CampaignRepository

    async def __aenter__(self) -> "UnitOfWorkPort": ...

    async def __aexit__(self, exc_type, exc_val, exc_tb): ...

    async def commit(self): ...

    async def rollback(self): ...
