"""Automatic RSVP reminders (the daily evaluate_reminders cron, see
worker.py). A household gets a reminder only when ALL of these hold:

1. RSVPs are open (domain/rsvp_window.py, the same window that accepts
   submissions).
2. It was actually sent an RSVP invitation (an RSVP_INVITE email with
   status SENT). A reminder to RSVP makes no sense before the invitation.
3. At least one of its guests hasn't responded, or answered "Not Sure Yet".
   (2 and 3: services/audience.py, shared with hand-made reminder campaigns.)
4. It has had fewer than wedding.reminder_cap reminders (0 = never).
5. reminder_interval_days calendar days (at the venue) have passed since
   its last contact: the invitation, or its most recent reminder.
"""

import datetime as dt

from service_wed.config.venue import venue_date
from service_wed.domain.errors import NotFoundError
from service_wed.domain.rsvp_window import RsvpWindow, rsvp_window
from service_wed.domain.value_objects import CampaignStatus, CampaignType
from service_wed.ports.repositories.email_message import ReminderStats
from service_wed.ports.uow import UnitOfWorkPort
from service_wed.schemas.campaign import CampaignAdminView
from service_wed.services.audience import households_awaiting_answer
from service_wed.services.campaigns import build_email_message


class ReminderService:
    def __init__(self, uow: UnitOfWorkPort) -> None:
        self.uow = uow

    async def reconcile(
        self, *, subject: str, template_key: str = "reminder"
    ) -> CampaignAdminView | None:
        """Create and fan out a REMINDER campaign."""
        async with self.uow:
            wedding = await self.uow.wedding_repo.get()
            if wedding is None:
                raise NotFoundError("Wedding configuration has not been set up.")

            now = dt.datetime.now(dt.timezone.utc)
            window = rsvp_window(
                opens_at=wedding.rsvp_opens_at,
                deadline=wedding.rsvp_deadline,
                now=now,
            )
            if window != RsvpWindow.OPEN:
                return None

            awaiting = await households_awaiting_answer(self.uow)
            if not awaiting:
                return None
            stats = await self.uow.email_message_repo.get_reminder_stats(
                [household.id for household, _ in awaiting]
            )

            interval = dt.timedelta(days=wedding.reminder_interval_days)
            eligible = [
                household
                for household, invited_at in awaiting
                if self._is_due(
                    invited_at=invited_at,
                    stats=stats.get(household.id),
                    cap=wedding.reminder_cap,
                    interval=interval,
                    now=now,
                )
            ]
            if not eligible:
                return None

            campaign = await self.uow.campaign_repo.create(
                type=CampaignType.REMINDER,
                subject=subject,
                template_key=template_key,
                scheduled_for=now,
                created_by=None,
            )

            messages = [
                message
                for household in eligible
                if (message := build_email_message(household, campaign, wedding))
                is not None
            ]
            if not messages:
                await self.uow.commit()
                return CampaignAdminView.model_validate(campaign)
            await self.uow.email_message_repo.create_batch(messages)
            campaign = await self.uow.campaign_repo.update_status(
                campaign.id, CampaignStatus.SCHEDULED
            )
            await self.uow.commit()
            return CampaignAdminView.model_validate(campaign)

    @staticmethod
    def _is_due(
        *,
        invited_at: dt.datetime | None,
        stats: ReminderStats | None,
        cap: int,
        interval: dt.timedelta,
        now: dt.datetime,
    ) -> bool:
        """Whether a non-responding household should get a reminder now."""
        if invited_at is None:
            return False  # never invited: nothing to remind them about
        sent_so_far = stats.reminder_count if stats else 0
        if sent_so_far >= cap:
            return False  # also covers cap=0: reminders turned off
        last_contact = invited_at
        if stats and stats.last_scheduled_for and stats.last_scheduled_for > invited_at:
            last_contact = stats.last_scheduled_for
        # Whole calendar days at the venue, not exact durations: the cron
        # runs once a day, so a reminder a week ago at 09:00:00.120 must
        # still be due today at 09:00:00.080 (and across a DST change, and
        # a week after a mid-afternoon invitation), not slip to day 8.
        return (venue_date(now) - venue_date(last_contact)).days >= interval.days
