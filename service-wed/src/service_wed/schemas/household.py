import uuid
from pydantic import BaseModel, ConfigDict, EmailStr


class GuestAdminView(BaseModel):
    id: uuid.UUID
    full_name: str
    email: EmailStr | None
    is_plus_one: bool

    model_config = ConfigDict(from_attributes=True)


class HouseholdAdminView(BaseModel):
    id: uuid.UUID
    display_name: str
    contact_email: EmailStr | None
    invite_token: str
    guests: list[GuestAdminView]

    model_config = ConfigDict(from_attributes=True)
