import uuid
from pydantic import BaseModel, Field, field_validator
from service_wed.domain.value_objects import RsvpStatus


class GuestRsvpSubmission(BaseModel):
    """A single guest's RSVP answers."""

    guest_id: uuid.UUID
    status: RsvpStatus
    meal_choice: str | None = Field(default=None, max_length=255)
    dietary_notes: str | None = Field(default=None, max_length=1000)


class PlusOneSubmission(BaseModel):
    """A guest someone in the household is bringing. They're always
    attending (not bringing them = leaving them out of the list)."""

    # Set when editing a plus-one already saved (from the invitation's
    # guests); left out for a new one.
    guest_id: uuid.UUID | None = None
    full_name: str = Field(max_length=255)
    meal_choice: str | None = Field(default=None, max_length=255)
    dietary_notes: str | None = Field(default=None, max_length=1000)

    @field_validator("full_name")
    @classmethod
    def _name_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Please enter your guest's full name.")
        return value


class HouseholdRsvpSubmitRequest(BaseModel):
    """The payload sent when the user clicks 'Submit RSVP' for their household."""

    responses: list[GuestRsvpSubmission]

    # The household's full list of plus-ones after this submit: saved ones
    # missing from it are removed, so [] removes them all. None (left out)
    # leaves any saved plus-ones as they are.
    plus_ones: list[PlusOneSubmission] | None = Field(default=None, max_length=10)

    message_to_couple: str | None = Field(default=None, max_length=2000)
    song_request: str | None = Field(default=None, max_length=255)
