// Mirrors service-wed's schemas/invitation.py::MagicLinkRecoveryRequest.
// SuccessResponse is shared with auth/rsvp rather than redefined here.
export type { SuccessResponse } from "../../types";

export interface MagicLinkRecoveryRequest {
  full_name: string;
  email: string;
}
