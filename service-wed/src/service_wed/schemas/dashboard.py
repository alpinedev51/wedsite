# dashboard summary DTOs
from pydantic import BaseModel

from service_wed.domain.value_objects import EmailEventType, EmailStatus


class DashboardStatsResponse(BaseModel):
    """RSVP-side summary: the admin dashboard's headline numbers."""

    total_invited: int
    total_attending: int
    total_declined: int
    # RsvpStatus.WAITING is a response a household can actually submit (e.g.
    # "not sure yet"), distinct from total_no_response below (households
    # that haven't submitted anything for this guest at all).
    total_waiting: int
    total_no_response: int
    households_total: int
    households_responded: int
    households_pending: int
    days_until_wedding: int


class DeliveryStatsResponse(BaseModel):
    """Email delivery summary: counts by EmailMessage.status, plus
    bounce/complaint counts sourced from provider webhook events -- a
    successful "sent" only means the provider accepted it, not that it
    reached an inbox, so bounced/complained is the more honest health
    signal for outreach quality."""

    scheduled: int
    sending: int
    sent: int
    failed: int
    canceled: int
    bounced: int
    complained: int
    # Engagement signal, not a health/failure signal like bounced/complained
    # above -- these come from the same webhook events but are purely
    # informational (a low open rate isn't a "failure" the way a bounce is).
    opened: int
    clicked: int

    @classmethod
    def from_counts(
        cls,
        status_counts: dict[EmailStatus, int],
        event_counts: dict[EmailEventType, int],
    ) -> "DeliveryStatsResponse":
        """Shared by DashboardService (unscoped counts, every message ever
        sent) and CampaignService's detail view (counts scoped to one
        campaign via count_by_status/count_by_type's campaign_id filter) --
        both just hand this the dict a grouped-count query returns."""
        return cls(
            scheduled=status_counts.get(EmailStatus.SCHEDULED, 0),
            sending=status_counts.get(EmailStatus.SENDING, 0),
            sent=status_counts.get(EmailStatus.SENT, 0),
            failed=status_counts.get(EmailStatus.FAILED, 0),
            canceled=status_counts.get(EmailStatus.CANCELED, 0),
            bounced=event_counts.get(EmailEventType.BOUNCED, 0),
            complained=event_counts.get(EmailEventType.COMPLAINED, 0),
            opened=event_counts.get(EmailEventType.OPENED, 0),
            clicked=event_counts.get(EmailEventType.CLICKED, 0),
        )


class DashboardResponse(BaseModel):
    rsvp: DashboardStatsResponse
    delivery: DeliveryStatsResponse
