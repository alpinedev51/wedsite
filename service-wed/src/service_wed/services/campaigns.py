# define + schedule campaign -> insert email_messages rows
from datetime import datetime
from uuid import UUID

from service_wed.ports.uow import UnitOfWorkPort
from service_wed.schemas.common import SuccessResponse
from service_wed.schemas.campaign import CampaignCreateRequest, CampaignAdminView, CampaignStatus, CampaignType


class CampaignService:
    def __init__(self, uow: UnitOfWorkPort) -> None:
        self.uow = uow

    async def create(self, campaign_type: CampaignType, subject: str, template_key: str, scheduled_for: datetime, created_by: UUID | None) -> None:
        async with self.uow:
            campaign = self.uow.campaign_repo.create(campaign_type, subject, template_key, scheduled_for, created_by)
            # if .... and exception handling stuff. TODO: Look for other thigns to go at creation

    async def schedule(self):
        # self.uow.campaign_repo.update_status()
        # maybe this should update the scheduled_for date??
        # TODO: Investigate use case for schedule (on top of create method)
        return

    async def fan_out(self):
        #TODO: select target hosueholds, build one EmailMessage per houshold with idempotency_key=f"{}" (matches the unique index already on EmailMessage), create_batch, then flip campagin draft to scheduled
        return
