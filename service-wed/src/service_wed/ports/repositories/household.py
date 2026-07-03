from typing import Protocol

from service_wed.models.household import Household


class HouseholdRepository(Protocol):
    async def create(
        self, display_name: str, contact_email: str | None, invite_token: str
    ) -> Household: ...

    async def get_by_invite_token(self, token: str) -> Household | None:
        """Fetch a household and its guests by the magic link token"""
        ...

    async def get_by_email(self, email: str) -> Household | None:
        """Fetch household by contact email. Useful for magic link recovery."""
        ...
