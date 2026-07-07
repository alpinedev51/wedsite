"""Campaign use cases: Define a bulk send as a draft, then fan it out into one EmailMessage per row per household for dispatch worker to pick up.

Lifecycle:  create() -> DRAFT (freely editable, nothing sent yet)
            schedule() -> still draft, just moves the planned send time
            fan_out() -> DRAFT -> SCHEDULED (email_messages now exist; tasks/dispatch.py owns delivery from here on)
"""

from __future__ import annotations
import datetime as dt
import uuid


from service_wed.config.settings import settings
from service_wed.domain.errors import ConflictError, NotFoundError, ValidationError
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
from service_wed.models.wedding import Wedding
from service_wed.ports.uow import UnitOfWorkPort
from service_wed.schemas.campaign import (
    CampaignCreateRequest,
    CampaignAdminView,
    CampaignDetailView,
)
from service_wed.schemas.common import Page
from service_wed.schemas.dashboard import DeliveryStatsResponse


def _ensure_future(scheduled_for: dt.datetime, now: dt.datetime) -> None:
    if scheduled_for <= now:
        raise ValidationError("scheduled_for must be in the future.")


def build_household_email_context(
    household: Household, wedding: Wedding | None = None
) -> dict[str, object]:
    """The context every household-facing email shares, regardless of
    campaign vs. one-off transactional (see services/rsvp.py's RSVP
    confirmation, which has no Campaign at all to hang this off of). This is
    the ONE place an RSVP link gets built -- templates reference
    {{ rsvp_url }} rather than reassembling PUBLIC_SITE_URL + invite_token
    themselves, so there's a single source of truth for that URL's shape
    (must match ui-wed's router.tsx `/rsvp/:token` route)."""
    context: dict[str, object] = {
        "household_name": household.display_name,
        "invite_token": household.invite_token,
        "rsvp_url": f"{settings.public_site_url}/rsvp/{household.invite_token}",
    }
    # `wedding` is optional (an email can in principle be built before the
    # wedding config exists) -- a template's {{ wedding_date }} etc. then
    # just renders nothing rather than the send failing outright. JSONB has
    # no native datetime support (see models/base.py's plain
    # dict[str, Any] -> JSONB mapping, no custom encoder), so these go in
    # pre-formatted, not as raw datetime objects.
    if wedding is not None:
        context.update(
            wedding_date=wedding.wedding_date.strftime("%B %-d, %Y"),
            rsvp_deadline=wedding.rsvp_deadline.strftime("%B %-d, %Y"),
            venue_name=wedding.venue_name,
            venue_address=wedding.venue_address,
        )
    return context


def build_email_message(
    household: Household, campaign: campaign.Campaign, wedding: Wedding | None = None
) -> EmailMessage | None:
    if not household.contact_email:
        return None

    return EmailMessage(
        campaign_id=campaign.id,
        household_id=household.id,
        guest_id=None,
        email_type=EmailType(campaign.type.value),
        recipient=household.contact_email,
        subject=campaign.subject,
        template_key=campaign.template_key,
        context=build_household_email_context(household, wedding),
        status=EmailStatus.SCHEDULED,
        scheduled_for=campaign.scheduled_for,
        idempotency_key=f"{campaign.id}:{household.id}",
    )


class CampaignService:
    def __init__(self, uow: UnitOfWorkPort) -> None:
        self.uow = uow

    async def create(
        self, request: CampaignCreateRequest, created_by: uuid.UUID | None
    ) -> CampaignAdminView:
        """Create a campaign draft. Does not touch email_messages at all."""
        if not template_exists(request.template_key):
            raise ValidationError(f"Unknown email template: {request.template_key}")

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

    async def list_campaigns(
        self, limit: int = 50, offset: int = 0
    ) -> Page[CampaignAdminView]:
        """Admin campaign list. Paginated: nothing here caps how many
        campaigns can accumulate over time, and the frontend list view
        shouldn't have to fetch them all to render one page."""
        async with self.uow:
            campaigns, total = await self.uow.campaign_repo.list_all(
                limit=limit, offset=offset
            )
            return Page(
                items=[CampaignAdminView.model_validate(c) for c in campaigns],
                total=total,
                limit=limit,
                offset=offset,
            )

    async def get(self, campaign_id: uuid.UUID) -> CampaignDetailView:
        """Admin campaign detail view. Unlike list_campaigns()'s plain
        CampaignAdminView, this also computes a live delivery breakdown
        scoped to just this campaign's fanned-out messages -- see
        CampaignDetailView's docstring for why that's the honest answer to
        "did this send go out," not campaign.status itself."""
        async with self.uow:
            campaign = await self.uow.campaign_repo.get_by_id(campaign_id)
            if campaign is None:
                raise NotFoundError(f"Campaign {campaign_id} does not exist.")
            status_counts = await self.uow.email_message_repo.count_by_status(
                campaign_id=campaign_id
            )
            event_counts = await self.uow.email_event_repo.count_by_type(
                campaign_id=campaign_id
            )
            delivery = DeliveryStatsResponse.from_counts(status_counts, event_counts)
            return CampaignDetailView(
                **CampaignAdminView.model_validate(campaign).model_dump(),
                delivery=delivery,
            )

    async def schedule(self, campaign_id: uuid.UUID, scheduled_for: dt.datetime):
        """Change a DRAFT campaign's planned send time."""
        async with self.uow:
            campaign = await self.uow.campaign_repo.get_by_id(campaign_id)
            if campaign is None:
                raise NotFoundError(f"Campaign {campaign_id} does not exist.")
            if campaign.status != CampaignStatus.DRAFT:
                raise ConflictError(
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
                raise NotFoundError(f"Campaign {campaign_id} does not exist.")
            if campaign.status != CampaignStatus.DRAFT:
                raise ConflictError(
                    f"Campaign {campaign_id} is already {campaign.status}; only DRAFT campaigns can be fanned out."
                )
            messages = await self._build_email_messages(campaign)
            if not messages:
                raise ConflictError(
                    f"Campaign {campaign_id} has no eligible recipients; nothing to fan out."
                )

            await self.uow.email_message_repo.create_batch(messages)
            campaign = await self.uow.campaign_repo.update_status(
                campaign_id, CampaignStatus.SCHEDULED
            )

            await self.uow.commit()
            return CampaignAdminView.model_validate(campaign)

    async def _build_email_messages(
        self, campaign: campaign.Campaign
    ) -> list[EmailMessage]:
        """Pick the target household list for campaign.type and build one."""
        wedding = await self.uow.wedding_repo.get()
        if campaign.type == CampaignType.REMINDER:
            households = await self.uow.household_repo.list_non_responding()
        else:
            households = await self.uow.household_repo.list_all()
        return [
            message
            for household in households
            if (message := build_email_message(household, campaign, wedding))
            is not None
        ]
