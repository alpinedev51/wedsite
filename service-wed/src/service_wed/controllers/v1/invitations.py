"""Find Your Invitation: public, read-only lookup by magic-link token, plus
recovering a lost link via name+email. No auth -- the token itself is the
credential.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from service_wed.dependencies import get_invitation_service
from service_wed.schemas.common import SuccessResponse
from service_wed.schemas.invitation import InvitationResponse, MagicLinkRecoveryRequest
from service_wed.services.invitation_lookup import InvitationService

router = APIRouter(tags=["invitations"])


# /recover must be declared before /{token}: FastAPI/Starlette matches routes
# in registration order, so a dynamic path param route registered first would
# shadow the literal "/recover" path and route it here as token="recover".
@router.post("/recover", status_code=status.HTTP_200_OK)
async def recover_magic_link(
    request: MagicLinkRecoveryRequest,
    invitation_service: Annotated[InvitationService, Depends(get_invitation_service)],
) -> SuccessResponse:
    return await invitation_service.recover_magic_link(request)


@router.get("/{token}")
async def get_invitation(
    token: str,
    invitation_service: Annotated[InvitationService, Depends(get_invitation_service)],
) -> InvitationResponse:
    return await invitation_service.get_invitation_by_token(token)
