from typing import Protocol

from service_wed.models.wedding import Wedding


class WeddingRepository(Protocol):
    """Port defining access to the singleton wedding configuration row."""

    async def get(self) -> Wedding | None:
        """Fetch the single wedding configuration row."""
        ...
