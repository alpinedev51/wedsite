# load household form; submit/edit RSVP (upsert) within edit window
import datetime as dt

from service_wed.ports.uow import UnitOfWorkPort
from service_wed.schemas.common import SuccessResponse
from service_wed.schemas.rsvp import HouseholdRsvpSubmitRequest


class RsvpService:
    def __init__(self, uow: UnitOfWorkPort) -> None:
        self.uow = uow

    async def submit_rsvp(
        self, token: str, request: HouseholdRsvpSubmitRequest
    ) -> SuccessResponse:
        async with self.uow:
            household = await self.uow.household_repo.get_by_invite_token(token)
            if not household:
                raise ValueError("Invalid invitation token.")

            # Ensure the frontend isn't trying to RSVP for guests in other households
            valid_guest_ids = {guest.id for guest in household.guests}

            for rsvp in request.responses:
                if rsvp.guest_id not in valid_guest_ids:
                    raise ValueError(
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
            household.rsvp_submitted_at = dt.datetime.now(dt.timezone.utc)

            await self.uow.commit()
            return SuccessResponse(success=True, message="Your RSVP has been saved!")
