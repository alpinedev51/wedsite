"""Find Your Invitation: public, read-only lookup by magic-link token, plus
recovering a lost link via name+email. No auth -- the token itself is the
credential.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from service_wed.dependencies import get_invitation_service
from service_wed.middleware.rate_limit import rate_limit
from service_wed.schemas.common import SuccessResponse
from service_wed.schemas.invitation import InvitationResponse, MagicLinkRecoveryRequest
from service_wed.services.invitation_lookup import InvitationService

router = APIRouter(tags=["invitations"])

# Both endpoints below are unauthenticated by design (the token/email IS the
# credential), which makes them the two obvious targets for automated
# guessing/scraping -- token space is large enough that this is about
# raising the cost, not the only defense, but it stops naive brute force.
_recovery_rate_limit = rate_limit("invitation_recovery", limit=5, window_seconds=900)
_token_lookup_rate_limit = rate_limit(
    "invitation_token_lookup", limit=30, window_seconds=300
)


# /recover must be declared before /{token}: FastAPI/Starlette matches routes
# in registration order, so a dynamic path param route registered first would
# shadow the literal "/recover" path and route it here as token="recover".
@router.post(
    "/recover",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(_recovery_rate_limit)],
)
async def recover_magic_link(
    request: MagicLinkRecoveryRequest,
    invitation_service: Annotated[InvitationService, Depends(get_invitation_service)],
) -> SuccessResponse:
    return await invitation_service.recover_magic_link(request)


@router.get("/{token}", dependencies=[Depends(_token_lookup_rate_limit)])
async def get_invitation(
    token: str,
    invitation_service: Annotated[InvitationService, Depends(get_invitation_service)],
) -> InvitationResponse:
    return await invitation_service.get_invitation_by_token(token)
