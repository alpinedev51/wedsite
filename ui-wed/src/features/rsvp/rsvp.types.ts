// Mirrors service-wed's schemas/invitation.py and schemas/rsvp.py -- keep
// these in sync if those backend DTOs change shape. RsvpStatus/SuccessResponse
// are shared with the admin guest-list feature/auth respectively rather than
// redefined here.
import type { RsvpStatus } from "../guests/guestList.types";

export type { RsvpStatus };
export type { SuccessResponse } from "../../types";

// GET /rsvp/{token} response -- pre-fills the form with whatever the
// household has already submitted, if anything.
export interface InvitationGuestDetail {
  id: string;
  full_name: string;
  is_plus_one: boolean;
  rsvp_status: RsvpStatus | null;
  meal_choice: string | null;
}

export interface InvitationResponse {
  id: string;
  display_name: string;
  guests: InvitationGuestDetail[];
}

// PUT /rsvp/{token} request body.
export interface GuestRsvpSubmission {
  guest_id: string;
  status: RsvpStatus;
  meal_choice: string | null;
  dietary_notes: string | null;
}

export interface HouseholdRsvpSubmitRequest {
  responses: GuestRsvpSubmission[];
  message_to_couple: string | null;
  song_request: string | null;
}
