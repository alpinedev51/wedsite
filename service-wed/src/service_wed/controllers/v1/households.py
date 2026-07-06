"""Admin: guest list management. Only CSV import is wired up right now --
GuestListService is the only service written so far for this area. Plain
CRUD (create/edit/delete a single household or guest by hand) has no backing
service method yet, so those routes aren't added until that's written; adding
them here first would mean the controller reaching past the service layer
straight into a repository, which breaks the pattern every other controller
in this file follows.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi import status as http_status

from service_wed.dependencies import get_guest_list_service
from service_wed.policies.admin import require_admin
from service_wed.schemas.common import SuccessResponse
from service_wed.services.guest_list import GuestListService

router = APIRouter(tags=["households"], dependencies=[Depends(require_admin)])


@router.post("/import", status_code=http_status.HTTP_200_OK)
async def import_guest_list(
    guest_list_service: Annotated[GuestListService, Depends(get_guest_list_service)],
    file: UploadFile = File(...),
) -> SuccessResponse:
    file_bytes = await file.read()
    return await guest_list_service.import_csv(file_bytes)
