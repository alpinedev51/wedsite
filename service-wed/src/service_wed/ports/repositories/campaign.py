import datetime as dt
import uuid
from typing import Protocol

from service_wed.domain.value_objects import (
    CampaignStatus,
    CampaignType,
)
from service_wed.models.campaign import Campaign


class CampaignRepository(Protocol):
    """Port defining campaign data access."""

    async def create(
        self,
        type: CampaignType,
        subject: str,
        template_key: str,
        scheduled_for: dt.datetime,
        created_by: uuid.UUID | None,
    ) -> Campaign:
        """Create a new campaign draft."""
        ...

    async def get_by_id(self, campaign_id: uuid.UUID) -> Campaign | None:
        """Fetch a single campaign."""
        ...

    async def list_all(
        self, limit: int, offset: int
    ) -> tuple[list[Campaign], int]:
        """Fetch one page of campaigns (newest-scheduled first) plus the
        total row count, for the admin campaign list view."""
        ...

    async def update_status(
        self, campaign_id: uuid.UUID, status: CampaignStatus
    ) -> Campaign:
        """Transition a campaign (e.g., DRAFT -> SCHEDULED -> SENDING -> SENT)."""
        ...
