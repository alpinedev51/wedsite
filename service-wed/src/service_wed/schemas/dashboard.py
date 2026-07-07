# dashboard summary DTOs
from pydantic import BaseModel


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


class DashboardResponse(BaseModel):
    rsvp: DashboardStatsResponse
    delivery: DeliveryStatsResponse
