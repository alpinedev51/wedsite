import { apiFetch } from "../../lib/api";
import type {
  HouseholdRsvpSubmitRequest,
  InvitationResponse,
  SuccessResponse,
} from "./rsvp.types";

// No admin auth on either call -- the token itself is the credential (see
// service-wed's controllers/v1/rsvp.py module docstring). Both are also
// rate-limited on the backend, shared with the invitation-lookup bucket.
export function getInvitation(token: string): Promise<InvitationResponse> {
  return apiFetch(`/rsvp/${encodeURIComponent(token)}`);
}

// Upsert, not append -- submitting again with the same guest_ids edits the
// existing response, so this same call covers both the first submission and
// any later edit up until the RSVP deadline (backend rejects with
// 409 rsvp_closed once it's passed, or before rsvp_opens_at).
export function submitRsvp(
  token: string,
  payload: HouseholdRsvpSubmitRequest,
): Promise<SuccessResponse> {
  return apiFetch(`/rsvp/${encodeURIComponent(token)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
