import { apiFetch } from "../../lib/api";
import type {
  CampaignAdminView,
  CampaignCreateRequest,
  CampaignRescheduleRequest,
  Page,
} from "./campaigns.types";

export function listCampaigns(
  limit = 50,
  offset = 0,
): Promise<Page<CampaignAdminView>> {
  return apiFetch(`/admin/campaigns?limit=${limit}&offset=${offset}`);
}

export function getCampaign(id: string): Promise<CampaignAdminView> {
  return apiFetch(`/admin/campaigns/${id}`);
}

// Creating a draft doesn't touch email_messages at all -- nothing is
// queued or sent until fanOutCampaign() below is called separately.
export function createCampaign(
  payload: CampaignCreateRequest,
): Promise<CampaignAdminView> {
  return apiFetch("/admin/campaigns", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Only works while the campaign is still "draft" -- a 409/conflict
// ApiError otherwise (backend enforces this, not this function).
export function rescheduleCampaign(
  id: string,
  payload: CampaignRescheduleRequest,
): Promise<CampaignAdminView> {
  return apiFetch(`/admin/campaigns/${id}/schedule`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Locks in a draft: builds one EmailMessage per household with a contact
// email and flips the campaign draft -> scheduled. Irreversible from the
// UI -- there's no unfan-out/cancel endpoint, so callers should confirm
// with the admin before calling this (see CampaignDetail).
export function fanOutCampaign(id: string): Promise<CampaignAdminView> {
  return apiFetch(`/admin/campaigns/${id}/fan-out`, { method: "POST" });
}
