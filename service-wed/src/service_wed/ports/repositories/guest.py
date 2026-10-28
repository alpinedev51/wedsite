import uuid
from typing import Protocol

from service_wed.domain.value_objects import RsvpStatus
from service_wed.models.guest import Guest


class GuestRepository(Protocol):
    async def create(
        self,
        household_id: uuid.UUID,
        full_name: str,
        email: str | None,
        is_plus_one: bool,
    ) -> Guest:
        """Add a guest to an existing household."""
        ...

    async def delete(self, guest: Guest) -> None:
        """Remove a guest and (by cascade) their RSVP answer."""
        ...

    async def count_by_rsvp_status(self) -> dict[RsvpStatus | None, int]:
        """Count every guest, grouped by RSVP status. A `None` key means the
        guest has no RsvpResponse row yet (their household hasn't submitted
        for them). Backs the admin dashboard's RSVP breakdown."""
        ...
