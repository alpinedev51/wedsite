import uuid
from typing import Protocol

from service_wed.models.household import Household


class HouseholdRepository(Protocol):
    async def create(
        self, display_name: str, contact_email: str | None, invite_token: str
    ) -> Household: ...

    async def get_by_invite_token(self, token: str) -> Household | None:
        """Fetch a household and its guests (with each guest's RSVP response)
        by the magic link token."""
        ...

    async def list_by_email(self, email: str) -> list[Household]:
        """Fetch every household sharing this contact email. contact_email
        has no uniqueness constraint (models/household.py) -- it's
        legitimate for two separate households to share one inbox (e.g. a
        parent managing RSVPs for two different branches of a family), so
        callers can't assume at most one match. Magic-link recovery
        disambiguates by name across whatever this returns (see
        _matches_full_name in services/invitation_lookup.py)."""
        ...

    async def get_by_display_name(self, display_name: str) -> Household | None:
        """Case-insensitive lookup by display name, returning the first
        match if more than one household happens to share a name (there's no
        uniqueness constraint on display_name). Used by CSV import to group
        guest rows under the same household by name rather than only by
        shared contact email, so a household with no email at all can still
        accumulate guests across multiple rows."""
        ...

    async def get_by_id(self, household_id: uuid.UUID) -> Household | None:
        """Fetch a single household (with guests + RSVP responses) by
        primary key, for the admin household detail view."""
        ...

    async def list_all(self) -> list[Household]:
        """Fetch every household. Used to fan out a send to everyone."""
        ...

    async def list_non_responding(self) -> list[Household]:
        """Fetch households with at least one guest who hasn't given a final
        answer: no RSVP yet, or "Not Sure Yet" (waiting)."""
        ...

    async def list_paginated(
        self, limit: int, offset: int
    ) -> tuple[list[Household], int]:
        """Fetch one page of households (with guests + RSVP responses),
        alphabetical by display name, plus the total row count -- backs the
        admin household list view."""
        ...

    async def list_all_with_guests(self) -> list[Household]:
        """Fetch every household with guests + RSVP responses eager-loaded,
        alphabetical by display name -- backs the admin CSV export, which
        (unlike list_paginated) needs every row, not one page of them."""
        ...

    async def count_summary(self) -> tuple[int, int]:
        """(total households, households that have submitted an RSVP) --
        backs the admin dashboard's RSVP breakdown."""
        ...
