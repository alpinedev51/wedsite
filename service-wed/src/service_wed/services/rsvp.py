# load household form; submit/edit RSVP (upsert) within edit window
import datetime as dt
import uuid

from service_wed.domain.errors import NotFoundError, RsvpClosedError, ValidationError
from service_wed.domain.rsvp_window import RsvpWindow, rsvp_window
from service_wed.domain.value_objects import EmailStatus, EmailType
from service_wed.models.email_message import EmailMessage
from service_wed.ports.uow import UnitOfWorkPort
from service_wed.schemas.common import SuccessResponse
from service_wed.schemas.rsvp import HouseholdRsvpSubmitRequest
from service_wed.services.campaigns import build_household_email_context

# Not admin-configurable (unlike a campaign's subject) -- this is a fixed,
# automatic transactional response, not something sent on a schedule.
_RSVP_CONFIRMATION_SUBJECT = "Your RSVP is Confirmed"


class RsvpService:
    def __init__(self, uow: UnitOfWorkPort) -> None:
        self.uow = uow

    async def submit_rsvp(
        self, token: str, request: HouseholdRsvpSubmitRequest
    ) -> SuccessResponse:
        async with self.uow:
            household = await self.uow.household_repo.get_by_invite_token(token)
            if not household:
                raise NotFoundError("Invalid invitation token.")

            now = dt.datetime.now(dt.timezone.utc)
            wedding = await self.uow.wedding_repo.get()
            if wedding:
                window = rsvp_window(
                    opens_at=wedding.rsvp_opens_at,
                    deadline=wedding.rsvp_deadline,
                    now=now,
                )
                if window == RsvpWindow.NOT_OPEN_YET:
                    raise RsvpClosedError("RSVPs are not open yet.")
                if window == RsvpWindow.CLOSED:
                    raise RsvpClosedError("The RSVP deadline has passed.")

            # Ensure the frontend isn't trying to RSVP for guests in other households
            valid_guest_ids = {guest.id for guest in household.guests}

            for rsvp in request.responses:
                if rsvp.guest_id not in valid_guest_ids:
                    raise ValidationError(
                        f"Guest ID {rsvp.guest_id} does not belong to this household."
                    )

                # Upsert the response using Postgres ON CONFLICT logic
                await self.uow.rsvp_repo.upsert_response(
                    guest_id=rsvp.guest_id,
                    status=rsvp.status,
                    meal_choice=rsvp.meal_choice,
                    dietary_notes=rsvp.dietary_notes,
                )

            # Update the Household-level denormalized fields
            household.message_to_couple = request.message_to_couple
            household.song_request = request.song_request
            if household.rsvp_submitted_at is None:
                household.rsvp_submitted_at = now
            household.rsvp_updated_at = now

            # Same on every submission, first-time or an edit before the
            # deadline -- "we've received your RSVP" reads fine either way,
            # so there's no need to track/branch on which case this is.
            # Silently skipped (not an error) if the household has no email
            # on file, same as a campaign's fan_out() skipping them -- there's
            # nowhere to send it.
            if household.contact_email:
                message = EmailMessage(
                    campaign_id=None,
                    household_id=household.id,
                    guest_id=None,
                    email_type=EmailType.RSVP_CONFIRMATION,
                    recipient=household.contact_email,
                    subject=_RSVP_CONFIRMATION_SUBJECT,
                    template_key="rsvp_confirmation",
                    context=build_household_email_context(household, wedding),
                    status=EmailStatus.SCHEDULED,
                    scheduled_for=now,
                    # A fresh key every submission, deliberately -- unlike a
                    # campaign's deterministic f"{campaign.id}:{household.id}"
                    # (one message per campaign per household, ever), a
                    # household can and should get a new confirmation email
                    # every time they submit/edit, so there's nothing to
                    # dedupe against here.
                    idempotency_key=f"rsvp_confirmation:{household.id}:{uuid.uuid4()}",
                )
                await self.uow.email_message_repo.create_batch([message])

            await self.uow.commit()
            return SuccessResponse(success=True, message="Your RSVP has been saved!")
