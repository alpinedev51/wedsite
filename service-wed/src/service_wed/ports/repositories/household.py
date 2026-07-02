from typing import Protocol

from service_wed.models.household import Household


class HouseholdRepository(Protocol):
    async def get_by_invite_token(self, token: str) -> Household | None:
        """Fetch a household and its guests by the magic link token"""
        ...
