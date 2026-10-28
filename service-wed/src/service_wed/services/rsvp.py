# load household form; submit/edit RSVP (upsert) within edit window
import datetime as dt
import uuid

from service_wed.domain.errors import NotFoundError, RsvpClosedError, ValidationError
from service_wed.domain.rsvp_window import RsvpWindow, rsvp_window
from service_wed.domain.value_objects import EmailStatus, EmailType, RsvpStatus
from service_wed.models.email_message import EmailMessage
from service_wed.models.guest import Guest
from service_wed.models.household import Household
from service_wed.ports.uow import UnitOfWorkPort
from service_wed.schemas.common import SuccessResponse
from service_wed.schemas.rsvp import HouseholdRsvpSubmitRequest, PlusOneSubmission
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

            # Ensure the frontend isn't trying to RSVP for guests in other
            # households. Everything is checked before anything is written.
            plus_ones = _brought_plus_ones(household)
            valid_guest_ids = {guest.id for guest in household.guests}
            for rsvp in request.responses:
                if rsvp.guest_id not in valid_guest_ids:
                    raise ValidationError(
                        f"Guest ID {rsvp.guest_id} does not belong to this household."
                    )
                if rsvp.guest_id in plus_ones:
                    raise ValidationError(
                        f"{plus_ones[rsvp.guest_id].full_name} is a guest you're "
                        "bringing; send their details as a plus-one."
                    )
            if request.plus_ones is not None:
                _check_plus_ones(household, plus_ones, request)

            for rsvp in request.responses:
                # Upsert the response using Postgres ON CONFLICT logic
                await self.uow.rsvp_repo.upsert_response(
                    guest_id=rsvp.guest_id,
                    status=rsvp.status,
                    meal_choice=rsvp.meal_choice,
                    dietary_notes=rsvp.dietary_notes,
                )
            if request.plus_ones is not None:
                await self._save_plus_ones(household, plus_ones, request.plus_ones)

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

    async def _save_plus_ones(
        self,
        household: Household,
        saved: dict[uuid.UUID, Guest],
        submitted: list[PlusOneSubmission],
    ) -> None:
        """Make the household's plus-ones match `submitted`: update the
        ones it lists, add new ones, and remove saved ones it leaves out.
        Every plus-one is attending."""
        # Which saved guest each submission edits: its guest_id, or else a
        # saved plus-one with the same name (a resubmit from a page that
        # wasn't reloaded), so their ID and history are kept.
        claimed = {p.guest_id for p in submitted if p.guest_id is not None}
        targets: list[Guest | None] = []
        for plus_one in submitted:
            if plus_one.guest_id is not None:
                targets.append(saved[plus_one.guest_id])
                continue
            same_name = next(
                (
                    g
                    for g in saved.values()
                    if g.id not in claimed
                    and _same_name(g.full_name, plus_one.full_name)
                ),
                None,
            )
            if same_name is not None:
                claimed.add(same_name.id)
            targets.append(same_name)

        for removed in list(saved.values()):
            if removed.id not in claimed:
                household.guests.remove(removed)
                await self.uow.guest_repo.delete(removed)

        for plus_one, target in zip(submitted, targets):
            if target is None:
                guest = await self.uow.guest_repo.create(
                    household_id=household.id,
                    full_name=plus_one.full_name,
                    email=household.contact_email,
                    is_plus_one=True,
                )
            else:
                guest = target
                guest.full_name = plus_one.full_name
            await self.uow.rsvp_repo.upsert_response(
                guest_id=guest.id,
                status=RsvpStatus.ATTENDING,
                meal_choice=plus_one.meal_choice,
                dietary_notes=plus_one.dietary_notes,
            )


def _same_name(a: str, b: str) -> bool:
    return a.strip().casefold() == b.strip().casefold()


def _brought_plus_ones(household: Household) -> dict[uuid.UUID, Guest]:
    """The guests this household brought, which the RSVP form edits in its
    plus-one section. Only when the household may bring someone: a guest
    the couple listed with IsPlusOne in a household that may bring no one
    (e.g. "Guest of Ann") is answered for like any invited guest."""
    if household.plus_ones_allowed <= 0:
        return {}
    return {g.id: g for g in household.guests if g.is_plus_one}


def _check_plus_ones(
    household: Household,
    saved: dict[uuid.UUID, Guest],
    request: HouseholdRsvpSubmitRequest,
) -> None:
    """Reject a plus-one list the invitation doesn't allow. The RSVP form
    already prevents all of these; this keeps a hand-made request from
    adding more people than the couple invited."""
    submitted = request.plus_ones or []
    if not submitted:
        return
    allowed = household.plus_ones_allowed
    if allowed <= 0:
        raise ValidationError("This invitation doesn't include bringing a guest.")
    # If the couple lowered the allowance after guests were added, those
    # guests can still be edited or removed, but no one new can be added
    # until the household is back within it.
    if len(submitted) > allowed and any(p.guest_id is None for p in submitted):
        raise ValidationError(
            f"This invitation includes {allowed} guest(s) you can bring, "
            f"but {len(submitted)} were sent."
        )

    seen_ids: set[uuid.UUID] = set()
    for plus_one in submitted:
        if plus_one.guest_id is None:
            continue
        if plus_one.guest_id not in saved:
            raise ValidationError(
                f"Guest ID {plus_one.guest_id} isn't a guest this household is bringing."
            )
        if plus_one.guest_id in seen_ids:
            raise ValidationError("The same guest was sent twice.")
        seen_ids.add(plus_one.guest_id)

    invited = [g for g in household.guests if g.id not in saved]
    names: list[str] = []
    for plus_one in submitted:
        if any(_same_name(plus_one.full_name, n) for n in names):
            raise ValidationError(
                f"{plus_one.full_name} is listed twice. Each guest needs their own name."
            )
        if any(_same_name(plus_one.full_name, g.full_name) for g in invited):
            raise ValidationError(
                f"{plus_one.full_name} is already on this invitation, so they don't "
                "need to be added as a guest."
            )
        names.append(plus_one.full_name)

    # A plus-one comes with someone: at least one invited guest has to be
    # attending once this submit is saved.
    statuses = {g.id: g.rsvp_status for g in invited}
    statuses.update({r.guest_id: r.status for r in request.responses})
    if RsvpStatus.ATTENDING not in statuses.values():
        raise ValidationError(
            "A guest can only be added when someone on the invitation is attending."
        )
