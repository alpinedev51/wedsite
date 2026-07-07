"""Admin: create/reschedule/fan-out email campaigns. Every route requires an
authenticated admin session (see policies/admin.py)."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from service_wed.dependencies import get_campaign_service
from service_wed.models.admin_user import AdminUser
from service_wed.policies.admin import require_admin
from service_wed.schemas.campaign import (
    CampaignAdminView,
    CampaignCreateRequest,
    CampaignRescheduleRequest,
)
from service_wed.schemas.common import Page
from service_wed.services.campaigns import CampaignService

# Router-level dependency: blanket-protects every route below with one
# declaration instead of repeating Depends(require_admin) on each endpoint.
# FastAPI caches a dependency's result per request, so an endpoint that also
# needs the AdminUser object itself (create_campaign, below) can still
# declare its own Depends(require_admin) param without running it twice.
router = APIRouter(tags=["campaigns"], dependencies=[Depends(require_admin)])


@router.get("")
async def list_campaigns(
    campaign_service: Annotated[CampaignService, Depends(get_campaign_service)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[CampaignAdminView]:
    """Admin campaign list, newest-scheduled first. Backs the frontend's
    "campaigns" table view."""
    return await campaign_service.list_campaigns(limit=limit, offset=offset)


@router.get("/{campaign_id}")
async def get_campaign(
    campaign_id: uuid.UUID,
    campaign_service: Annotated[CampaignService, Depends(get_campaign_service)],
) -> CampaignAdminView:
    """Single campaign detail, for a campaign detail/edit page."""
    return await campaign_service.get(campaign_id)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_campaign(
    request: CampaignCreateRequest,
    admin: Annotated[AdminUser, Depends(require_admin)],
    campaign_service: Annotated[CampaignService, Depends(get_campaign_service)],
) -> CampaignAdminView:
    return await campaign_service.create(request, created_by=admin.id)


@router.post("/{campaign_id}/schedule")
async def reschedule_campaign(
    campaign_id: uuid.UUID,
    request: CampaignRescheduleRequest,
    campaign_service: Annotated[CampaignService, Depends(get_campaign_service)],
) -> CampaignAdminView:
    return await campaign_service.schedule(campaign_id, request.scheduled_for)


@router.post("/{campaign_id}/fan-out")
async def fan_out_campaign(
    campaign_id: uuid.UUID,
    campaign_service: Annotated[CampaignService, Depends(get_campaign_service)],
) -> CampaignAdminView:
    """Locks in the campaign: builds one EmailMessage per eligible household
    and flips it DRAFT -> SCHEDULED. tasks/dispatch.py's cron picks the
    messages up on its own schedule from here -- this endpoint doesn't send
    anything itself."""
    return await campaign_service.fan_out(campaign_id)
