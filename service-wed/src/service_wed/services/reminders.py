import datetime as dt

from service_wed.domain.value_objects import CampaignStatus, CampaignType
from service_wed.ports.repositories.email_message import ReminderStats
from service_wed.ports.uow import UnitOfWorkPort
from service_wed.schemas.campaign import CampaignAdminView
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
                raise ValueError("Wedding configuration has not been set up.")
            non_responding = await self.uow.household_repo.list_non_responding()
            if not non_responding:
                return None

            stats = await self.uow.email_message_repo.get_reminder_stats(
                [household.id for household in non_responding]
            )

            now = dt.datetime.now(dt.timezone.utc)
            interval = dt.timedelta(days=wedding.reminder_interval_days)
            eligible = [
                household
                for household in non_responding
                if self._is_due(
                    stats.get(household.id),
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
                if (message := build_email_message(household, campaign)) is not None
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
        stats: ReminderStats | None,
        *,
        cap: int,
        interval: dt.timedelta,
        now: dt.datetime,
    ) -> bool:
        """Whether a household with the given reminder history should get another reminder right now."""
        if stats is None:
            return True
        if stats.reminder_count >= cap:
            return False
        if stats.last_scheduled_for is None:
            return True
        return now - stats.last_scheduled_for >= interval
