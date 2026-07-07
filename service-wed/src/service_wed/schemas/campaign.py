import datetime as dt
import uuid
from pydantic import BaseModel, ConfigDict, Field
from service_wed.domain.value_objects import CampaignType, CampaignStatus
from service_wed.schemas.dashboard import DeliveryStatsResponse


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


# Detail-only: a per-campaign delivery breakdown (reuses DeliveryStatsResponse,
# the same shape the global dashboard uses) computed live from
# email_messages/email_events filtered to this campaign's id. Deliberately not
# on CampaignAdminView -- that would mean either a grouped-count query per row
# on the list endpoint (expensive for a page of 50) or a field that's always
# null there, so it's only added on the single-campaign GET.
#
# This is also *why* campaign.status itself never progresses past "scheduled"
# once fanned out (see services/campaigns.py): a campaign explodes into N
# independent EmailMessage rows, each with its own lifecycle, so there's no
# single honest status value for "the campaign" as a whole once some
# messages have sent and others haven't -- this breakdown is the real answer
# to "how did this send go," not a rolled-up campaign.status.
class CampaignDetailView(CampaignAdminView):
    delivery: DeliveryStatsResponse


# Added for controllers/v1/campaigns.py's reschedule endpoint: the only
# field CampaignService.schedule() needs from the request body.
class CampaignRescheduleRequest(BaseModel):
    scheduled_for: dt.datetime
