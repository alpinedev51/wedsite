import datetime as dt
from typing import Protocol

from service_wed.models.wedding import Wedding


class WeddingRepository(Protocol):
    """Port defining access to the singleton wedding configuration row."""

    async def get(self) -> Wedding | None:
        """Fetch the single wedding configuration row."""
        ...

    async def upsert(
        self,
        *,
        wedding_date: dt.datetime,
        rsvp_deadline: dt.datetime,
        rsvp_opens_at: dt.datetime | None,
        reminder_cap: int,
        reminder_interval_days: int,
        venue_name: str | None,
        venue_address: str | None,
    ) -> Wedding:
        """Create or overwrite the singleton wedding row (WEDDING_ID). There's
        only ever one row, so this is a full upsert, not separate
        create/update methods -- matches the admin API's single PUT
        endpoint."""
        ...
