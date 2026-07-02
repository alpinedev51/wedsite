import uuid
from pydantic import BaseModel, Field
from service_wed.domain.value_objects import RsvpStatus


class GuestRsvpSubmission(BaseModel):
    """A single guest's RSVP answers."""

    guest_id: uuid.UUID
    status: RsvpStatus
    meal_choice: str | None = Field(default=None, max_length=255)
    dietary_notes: str | None = Field(default=None, max_length=1000)


class HouseholdRsvpSubmitRequest(BaseModel):
    """The payload sent when the user clicks 'Submit RSVP' for their household."""

    responses: list[GuestRsvpSubmission]

    message_to_couple: str | None = Field(default=None, max_length=2000)
    song_request: str | None = Field(default=None, max_length=255)
