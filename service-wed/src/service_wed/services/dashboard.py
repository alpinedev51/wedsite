"""Dashboard: aggregate RSVP + delivery stats for the admin's one-screen
overview. Every number here comes from a grouped-count query (repo layer),
never by loading every household/message into Python and counting in a
loop -- this endpoint has to stay cheap however many guests/campaigns exist.
"""

from __future__ import annotations

import datetime as dt

from service_wed.config.venue import venue_date
from service_wed.domain.value_objects import RsvpStatus
from service_wed.ports.uow import UnitOfWorkPort
from service_wed.schemas.dashboard import (
    DashboardResponse,
    DashboardStatsResponse,
    DeliveryStatsResponse,
)


class DashboardService:
    def __init__(self, uow: UnitOfWorkPort) -> None:
        self.uow = uow

    async def get_stats(self) -> DashboardResponse:
        async with self.uow:
            wedding = await self.uow.wedding_repo.get()
            guest_status_counts = await self.uow.guest_repo.count_by_rsvp_status()
            (
                households_total,
                households_responded,
            ) = await self.uow.household_repo.count_summary()
            email_status_counts = await self.uow.email_message_repo.count_by_status()
            event_type_counts = await self.uow.email_event_repo.count_by_type()

        # guest_status_counts' None key is "no RsvpResponse row yet" (see
        # GuestRepository.count_by_rsvp_status's docstring), not one of the
        # three real RsvpStatus values a household can submit.
        total_no_response = guest_status_counts.get(None, 0)
        total_invited = sum(guest_status_counts.values())

        days_until_wedding = 0
        if wedding is not None:
            now = dt.datetime.now(dt.timezone.utc)
            # Whole calendar days, not a raw timedelta -- comparing dates
            # (not datetimes) avoids an off-by-one from time-of-day alone
            # (e.g. wedding at 3pm tomorrow vs. now at 4pm today).
            # Both sides as venue calendar dates -- UTC dates would roll
            # over at 6 PM Durango time and count a day early each evening.
            days_until_wedding = (
                venue_date(wedding.wedding_date) - venue_date(now)
            ).days

        rsvp = DashboardStatsResponse(
            total_invited=total_invited,
            total_attending=guest_status_counts.get(RsvpStatus.ATTENDING, 0),
            total_declined=guest_status_counts.get(RsvpStatus.DECLINED, 0),
            total_waiting=guest_status_counts.get(RsvpStatus.WAITING, 0),
            total_no_response=total_no_response,
            households_total=households_total,
            households_responded=households_responded,
            households_pending=households_total - households_responded,
            days_until_wedding=days_until_wedding,
        )
        delivery = DeliveryStatsResponse.from_counts(
            email_status_counts, event_type_counts
        )
        return DashboardResponse(rsvp=rsvp, delivery=delivery)
