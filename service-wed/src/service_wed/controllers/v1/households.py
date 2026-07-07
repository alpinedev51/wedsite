"""Admin: guest list management. List/detail + CSV import are wired up;
plain single-record CRUD (create/edit/delete one household or guest by hand)
has no backing service method yet, so those routes aren't added until that's
written -- adding them here first would mean the controller reaching past
the service layer straight into a repository, which breaks the pattern
every other controller in this file follows.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, UploadFile
from fastapi import status as http_status

from service_wed.dependencies import get_guest_list_service
from service_wed.policies.admin import require_admin
from service_wed.schemas.common import Page
from service_wed.schemas.household import GuestImportResponse, HouseholdAdminView
from service_wed.services.guest_list import GuestListService

router = APIRouter(tags=["households"], dependencies=[Depends(require_admin)])


@router.get("")
async def list_households(
    guest_list_service: Annotated[GuestListService, Depends(get_guest_list_service)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[HouseholdAdminView]:
    """Admin household/guest list, with each guest's RSVP status."""
    return await guest_list_service.list_households(limit=limit, offset=offset)


@router.get("/{household_id}")
async def get_household(
    household_id: uuid.UUID,
    guest_list_service: Annotated[GuestListService, Depends(get_guest_list_service)],
) -> HouseholdAdminView:
    """Single household detail, for a household/guest detail page."""
    return await guest_list_service.get_household(household_id)


@router.post("/import", status_code=http_status.HTTP_200_OK)
async def import_guest_list(
    guest_list_service: Annotated[GuestListService, Depends(get_guest_list_service)],
    file: UploadFile = File(...),
) -> GuestImportResponse:
    file_bytes = await file.read()
    return await guest_list_service.import_csv(file_bytes)
