import uuid
from pydantic import BaseModel, ConfigDict, EmailStr

from service_wed.domain.value_objects import RsvpStatus


class GuestAdminView(BaseModel):
    id: uuid.UUID
    full_name: str
    email: EmailStr | None
    is_plus_one: bool
    # Read via Guest.rsvp_status/.meal_choice (models/guest.py properties over
    # the guest's rsvp_response relationship) -- this is the whole point of
    # an admin guest list: seeing who has and hasn't responded, and to what.
    rsvp_status: RsvpStatus | None = None
    meal_choice: str | None = None

    model_config = ConfigDict(from_attributes=True)


class HouseholdAdminView(BaseModel):
    id: uuid.UUID
    display_name: str
    contact_email: EmailStr | None
    invite_token: str
    plus_ones_allowed: int = 0
    guests: list[GuestAdminView]

    model_config = ConfigDict(from_attributes=True)


class GuestImportResponse(BaseModel):
    """Result of a CSV import. Distinct from the generic SuccessResponse
    because an import can partially succeed -- every row that could be
    imported unambiguously was, but `warnings` flags rows worth a second
    look (e.g. a guest with neither a household name nor a contact email)."""

    success: bool = True
    message: str
    warnings: list[str] = []
