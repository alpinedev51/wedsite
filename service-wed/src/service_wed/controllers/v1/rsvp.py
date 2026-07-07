"""RSVP form: resolve a household by its magic-link token, then let them
submit/edit their responses. No admin auth -- the token is the credential,
same as invitations.py."""

from typing import Annotated

from fastapi import APIRouter, Depends

from service_wed.dependencies import get_invitation_service, get_rsvp_service
from service_wed.middleware.rate_limit import rate_limit
from service_wed.schemas.common import SuccessResponse
from service_wed.schemas.invitation import InvitationResponse
from service_wed.schemas.rsvp import HouseholdRsvpSubmitRequest
from service_wed.services.invitation_lookup import InvitationService
from service_wed.services.rsvp import RsvpService

router = APIRouter(tags=["rsvp"])

# Same bucket key as invitations.py's token lookup: both routes guess the
# same token space, keyed by client IP, so an attacker probing through
# either endpoint hits one shared limit rather than getting 2x the budget
# by splitting requests across both.
_token_lookup_rate_limit = rate_limit(
    "invitation_token_lookup", limit=30, window_seconds=300
)
_submit_rate_limit = rate_limit("rsvp_submit", limit=20, window_seconds=300)


@router.get("/{token}", dependencies=[Depends(_token_lookup_rate_limit)])
async def get_current_response(
    token: str,
    invitation_service: Annotated[InvitationService, Depends(get_invitation_service)],
) -> InvitationResponse:
    """Load the household + each guest's current RSVP status, to pre-fill
    the form. Reuses InvitationService -- it's the same underlying
    household+guests read, just consumed by a different page."""
    return await invitation_service.get_invitation_by_token(token)


@router.put("/{token}", dependencies=[Depends(_submit_rate_limit)])
async def submit_response(
    token: str,
    request: HouseholdRsvpSubmitRequest,
    rsvp_service: Annotated[RsvpService, Depends(get_rsvp_service)],
) -> SuccessResponse:
    return await rsvp_service.submit_rsvp(token, request)
