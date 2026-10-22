import uuid
from pydantic import BaseModel, ConfigDict, EmailStr
from service_wed.domain.value_objects import RsvpStatus


class MagicLinkRecoveryRequest(BaseModel):
    """Payload sent when a guest loses their link and requests a new one."""

    full_name: str
    email: EmailStr


class InvitationGuestDetail(BaseModel):
    id: uuid.UUID
    full_name: str
    is_plus_one: bool
    rsvp_status: RsvpStatus | None = None
    meal_choice: str | None = None
    dietary_notes: str | None = None

    model_config = ConfigDict(from_attributes=True)


class InvitationResponse(BaseModel):
    """Payload sent to frontend when a magic link is validated on page load."""

    id: uuid.UUID
    display_name: str
    guests: list[InvitationGuestDetail]
    # Returned so the RSVP form can pre-fill an edit: the submit replaces
    # these (and each guest's dietary_notes), so a form that started blank
    # would erase what the household entered before.
    message_to_couple: str | None = None
    song_request: str | None = None

    model_config = ConfigDict(from_attributes=True)
