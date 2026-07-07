"""Admin: CSV snapshot of guests/RSVPs -- lets the couple pull the full
guest list + RSVP outcomes into a spreadsheet (seating chart, caterer
headcount, ...) without going through the API directly."""

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from service_wed.dependencies import get_export_service
from service_wed.policies.admin import require_admin
from service_wed.services.exports import ExportService

router = APIRouter(tags=["exports"], dependencies=[Depends(require_admin)])


@router.get("/guests.csv")
async def export_guests_csv(
    export_service: Annotated[ExportService, Depends(get_export_service)],
) -> StreamingResponse:
    csv_text = await export_service.export_guests_csv()
    return StreamingResponse(
        iter([csv_text]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=guests.csv"},
    )
