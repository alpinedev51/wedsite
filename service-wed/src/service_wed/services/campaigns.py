"""Campaign use cases: Define a bulk send as a draft, then fan it out into one EmailMessage per row per household for dispatch worker to pick up.

Lifecycle:  create() -> DRAFT (freely editable, nothing sent yet)
            schedule() -> still draft, just moves the planned send time
            fan_out() -> DRAFT -> SCHEDULED (email_messages now exist; tasks/dispatch.py owns delivery from here on)
"""

from __future__ import annotations
import datetime as dt
import uuid


from service_wed.domain.value_objects import (
    CampaignStatus,
    CampaignType,
    EmailStatus,
    EmailType,
)
from service_wed.lib.templates import template_exists
from service_wed.models import campaign
from service_wed.models.email_message import EmailMessage
from service_wed.models.household import Household
from service_wed.ports.uow import UnitOfWorkPort
from service_wed.schemas.campaign import CampaignCreateRequest, CampaignAdminView


def _ensure_future(scheduled_for: dt.datetime, now: dt.datetime) -> None:
    if scheduled_for <= now:
        raise ValueError("scheduled_for must be in the future.")


class CampaignService:
    def __init__(self, uow: UnitOfWorkPort) -> None:
        self.uow = uow

    async def create(
        self, request: CampaignCreateRequest, created_by: uuid.UUID | None
    ) -> CampaignAdminView:
        """Create a campaign draft. Does not touch email_messages at all."""
        if not template_exists(request.template_key):
            raise ValueError(f"Unknown email template: {request.template_key}")

        now = dt.datetime.now(dt.timezone.utc)
        _ensure_future(request.scheduled_for, now=now)

        async with self.uow:
            campaign = await self.uow.campaign_repo.create(
                type=request.type,
                subject=request.subject,
                template_key=request.template_key,
                scheduled_for=request.scheduled_for,
                created_by=created_by,
            )
            await self.uow.commit()
            return CampaignAdminView.model_validate(campaign)

    async def schedule(self, campaign_id: uuid.UUID, scheduled_for: dt.datetime):
        """Change a DRAFT campaign's planned send time."""
        async with self.uow:
            campaign = await self.uow.campaign_repo.get_by_id(campaign_id)
            if campaign is None:
                raise ValueError(f"Campaign {campaign_id} does not exist.")
            if campaign.status != CampaignStatus.DRAFT:
                raise ValueError(
                    f"Campaign {campaign_id} is {campaign.status}; only DRAFT campaigns can be rescheduled."
                )
            now = dt.datetime.now(dt.timezone.utc)
            _ensure_future(scheduled_for, now=now)

            campaign.scheduled_for = scheduled_for
            await self.uow.commit()
            return CampaignAdminView.model_validate(campaign)

    async def fan_out(self, campaign_id: uuid.UUID):
        """Lock in a DRAFT campaign: build one EmailMessage per eligible household, insert them, and flip the campaign DRAFT -> SCHEDULED."""
        async with self.uow:
            campaign = await self.uow.campaign_repo.get_by_id(campaign_id)
            if campaign is None:
                raise ValueError(f"Campaign {campaign_id} does not exist.")
            if campaign.status != CampaignStatus.DRAFT:
                raise ValueError(
                    f"Campaign {campaign_id} is already {campaign.status}; only DRAFT campaigns can be fanned out."
                )

    async def _build_email_messages(
        self, campaign: campaign.Campaign
    ) -> list[EmailMessage]:
        """Pick a target household for campaign.type and build one."""
        if campaign.type == CampaignType.REMINDER:
            households = await self.uow.household_repo.list_non_responding()
        else:
            households = await self.uow.household_repo.list_all()

        messages: list[EmailMessage] = []
        for household in households:
            self._append_message_for(household, campaign, messages)
        return messages

    @staticmethod
    def _append_message_for(
        household: Household, campaign: campaign.Campaign, messages: list[EmailMessage]
    ) -> None:
        if not household.contact_email:
            return

        messages.append(
            EmailMessage(
                campaign_id=campaign.id,
                household_id=household.id,
                guest_id=None,
                email_type=EmailType(campaign.type.value),
                recipient=household.contact_email,
                subject=campaign.subject,
                template_key=campaign.template_key,
                context={
                    "household_name": household.display_name,
                    "invite_token": household.invite_token,
                },
                status=EmailStatus.SCHEDULED,
                scheduled_for=campaign.scheduled_for,
                idempotency_key=f"{campaign.id}:{household.id}",
            )
        )
