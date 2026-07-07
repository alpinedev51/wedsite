"""Wedding: the couple's single wedding-configuration row (models/wedding.py's
WEDDING_ID singleton).

Two routers, not one, because this endpoint has two different audiences at
two different trust levels: `public_router` (mounted at /wedding) is what the
public wedding website reads with no auth at all (countdown, venue, RSVP
deadline); `admin_router` (mounted at /admin/wedding) is how the couple sets
it, gated the same way every other admin route is. There's only ever one
wedding, so a single PUT that upserts the whole row is simpler than modeling
separate create/update endpoints or partial-patch semantics.
"""

from typing import Annotated

from fastapi import APIRouter, Depends

from service_wed.dependencies import get_wedding_service
from service_wed.policies.admin import require_admin
from service_wed.schemas.wedding import (
    WeddingAdminView,
    WeddingPublicView,
    WeddingUpsertRequest,
)
from service_wed.services.wedding import WeddingService

public_router = APIRouter(tags=["wedding"])


@public_router.get("")
async def get_wedding(
    wedding_service: Annotated[WeddingService, Depends(get_wedding_service)],
) -> WeddingPublicView:
    """404s (as a DomainError, not a raw 404) until the couple sets this up
    via PUT /admin/wedding -- the frontend should treat that as "not
    configured yet," not as a server error."""
    return await wedding_service.get_public()


admin_router = APIRouter(tags=["wedding"], dependencies=[Depends(require_admin)])


@admin_router.get("")
async def get_wedding_admin(
    wedding_service: Annotated[WeddingService, Depends(get_wedding_service)],
) -> WeddingAdminView:
    """Backs a settings-form GUI loading current values to edit."""
    return await wedding_service.get_admin()


@admin_router.put("")
async def upsert_wedding(
    request: WeddingUpsertRequest,
    wedding_service: Annotated[WeddingService, Depends(get_wedding_service)],
) -> WeddingAdminView:
    return await wedding_service.upsert(request)
