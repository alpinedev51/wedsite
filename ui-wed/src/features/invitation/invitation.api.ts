import { apiFetch } from "../../lib/api";
import type {
  MagicLinkRecoveryRequest,
  SuccessResponse,
} from "./invitation.types";

// No admin auth -- rate-limited server-side instead (5 / 15 min, see
// service-wed's controllers/v1/invitations.py). Always resolves with the
// same generic success message regardless of whether anything matched, so
// there's nothing to branch on here beyond network/rate-limit failures.
export function recoverMagicLink(
  request: MagicLinkRecoveryRequest,
): Promise<SuccessResponse> {
  return apiFetch("/invitations/recover", {
    method: "POST",
    body: JSON.stringify(request),
  });
}
