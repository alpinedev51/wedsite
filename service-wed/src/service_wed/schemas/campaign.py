import datetime as dt
import uuid
from pydantic import BaseModel, ConfigDict, Field
from service_wed.domain.value_objects import CampaignType, CampaignStatus


class CampaignCreateRequest(BaseModel):
    type: CampaignType
    subject: str = Field(..., max_length=255)
    template_key: str
    scheduled_for: dt.datetime


class CampaignAdminView(CampaignCreateRequest):
    """Unified read model for campaigns in the admin portal."""

    id: uuid.UUID
    status: CampaignStatus
    created_by: uuid.UUID | None

    model_config = ConfigDict(from_attributes=True)
