import uuid
from typing import Protocol
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
