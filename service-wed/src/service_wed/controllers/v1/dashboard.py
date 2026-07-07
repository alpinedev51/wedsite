"""Admin: RSVP summary + delivery stats -- one screen giving the couple/admin
a bird's-eye view without paging through every household or campaign."""

from typing import Annotated

from fastapi import APIRouter, Depends

from service_wed.dependencies import get_dashboard_service
from service_wed.policies.admin import require_admin
from service_wed.schemas.dashboard import DashboardResponse
from service_wed.services.dashboard import DashboardService

router = APIRouter(tags=["dashboard"], dependencies=[Depends(require_admin)])


@router.get("")
async def get_dashboard(
    dashboard_service: Annotated[DashboardService, Depends(get_dashboard_service)],
) -> DashboardResponse:
    return await dashboard_service.get_stats()
