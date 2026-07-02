import uuid
from typing import Protocol

from service_wed.domain.value_objects import RsvpStatus
from service_wed.models.rsvp_response import RsvpResponse


class RsvpRepository(Protocol):
    """Port defining RSVP data access."""

    async def upsert_response(
        self,
        guest_id: uuid.UUID,
        status: RsvpStatus,
        meal_choice: str | None,
        dietary_notes: str | None,
    ) -> RsvpResponse:
        """Create or update a guest's RSVP response."""
        ...
