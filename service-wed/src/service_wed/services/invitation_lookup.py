# status lookup; magic-link recovery to on-file email
import datetime as dt
import uuid

from service_wed.domain.errors import NotFoundError
from service_wed.domain.value_objects import EmailStatus, EmailType
from service_wed.models.email_message import EmailMessage
from service_wed.models.household import Household
from service_wed.ports.uow import UnitOfWorkPort
from service_wed.schemas.invitation import InvitationResponse, MagicLinkRecoveryRequest
from service_wed.schemas.common import SuccessResponse
from service_wed.services.campaigns import build_household_email_context

_MAGIC_LINK_RECOVERY_SUBJECT = "Your Wedding RSVP Link"


def _matches_full_name(household: Household, full_name: str) -> bool:
    """Matching on email alone would let anyone who merely knows (or
    guesses) a household's contact email trigger a resend of its RSVP link
    -- requiring the submitted name to match the household's display name or
    one of its guests is a cheap extra check. Doesn't weaken the
    email-enumeration defense below since the response is identical either
    way, regardless of whether this matches."""
    needle = full_name.strip().lower()
    if household.display_name.strip().lower() == needle:
        return True
    return any(guest.full_name.strip().lower() == needle for guest in household.guests)


class InvitationService:
    def __init__(self, uow: UnitOfWorkPort) -> None:
        self.uow = uow

    async def get_invitation_by_token(self, token: str) -> InvitationResponse:
        async with self.uow:
            household = await self.uow.household_repo.get_by_invite_token(token)
            if not household:
                raise NotFoundError("Invalid or expired invitation token.")

            # Pydantic's model_validate automatically reads the ORM object and
            # the @property accessors we added for rsvp_status/meal_choice
            return InvitationResponse.model_validate(household)

    async def recover_magic_link(
        self, request: MagicLinkRecoveryRequest
    ) -> SuccessResponse:
        async with self.uow:
            household = await self.uow.household_repo.get_by_email(request.email)

            if (
                household
                and household.contact_email
                and _matches_full_name(household, request.full_name)
            ):
                now = dt.datetime.now(dt.timezone.utc)
                wedding = await self.uow.wedding_repo.get()
                message = EmailMessage(
                    campaign_id=None,
                    household_id=household.id,
                    guest_id=None,
                    email_type=EmailType.MAGIC_LINK_RECOVERY,
                    recipient=household.contact_email,
                    subject=_MAGIC_LINK_RECOVERY_SUBJECT,
                    template_key="magic_link_recovery",
                    context=build_household_email_context(household, wedding),
                    status=EmailStatus.SCHEDULED,
                    scheduled_for=now,
                    # A fresh key every request, deliberately -- same
                    # reasoning as RsvpService's confirmation email, a
                    # household can request its link resent more than once.
                    idempotency_key=f"magic_link_recovery:{household.id}:{uuid.uuid4()}",
                )
                await self.uow.email_message_repo.create_batch([message])

            await self.uow.commit()

            # Always return success even if nothing matched, to prevent data leakage
            return SuccessResponse(
                success=True,
                message="If that email is on our list, a new link has been sent.",
            )
