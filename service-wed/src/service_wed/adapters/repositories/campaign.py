import datetime as dt
import uuid

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from service_wed.domain.value_objects import CampaignStatus, CampaignType
from service_wed.models.campaign import Campaign
from service_wed.ports.repositories.campaign import CampaignRepository


class SQLAlchemyCampaignRepository(CampaignRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        type: CampaignType,
        subject: str,
        template_key: str,
        scheduled_for: dt.datetime,
        created_by: uuid.UUID | None,
    ) -> Campaign:
        campaign = Campaign(
            type=type,
            subject=subject,
            template_key=template_key,
            scheduled_for=scheduled_for,
            created_by=created_by,
        )
        self.session.add(campaign)
        await self.session.flush()
        return campaign

    async def get_by_id(self, campaign_id: uuid.UUID) -> Campaign | None:
        result = await self.session.execute(
            select(Campaign).where(Campaign.id == campaign_id)
        )
        return result.scalar_one_or_none()

    async def update_status(
        self, campaign_id: uuid.UUID, status: CampaignStatus
    ) -> Campaign:
        stmt = (
            update(Campaign)
            .where(Campaign.id == campaign_id)
            .values(status=status)
            .returning(Campaign)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one()
