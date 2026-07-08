// Mirrors service-wed's schemas/dashboard.py -- keep these in sync if those
// backend DTOs change shape. DeliveryStatsResponse is also reused by
// features/campaigns (CampaignDetailView), matching the backend's own
// schemas/campaign.py importing this same shape from schemas/dashboard.py.
export interface DashboardStatsResponse {
  total_invited: number;
  total_attending: number;
  total_declined: number;
  total_waiting: number;
  total_no_response: number;
  households_total: number;
  households_responded: number;
  households_pending: number;
  days_until_wedding: number;
}

export interface DeliveryStatsResponse {
  scheduled: number;
  sending: number;
  sent: number;
  failed: number;
  canceled: number;
  bounced: number;
  complained: number;
  opened: number;
  clicked: number;
}

export interface DashboardResponse {
  rsvp: DashboardStatsResponse;
  delivery: DeliveryStatsResponse;
}
