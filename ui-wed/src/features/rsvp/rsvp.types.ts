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
  dietary_notes: string | null;
}

export interface InvitationResponse {
  id: string;
  display_name: string;
  // How many guests the household may bring. When above 0, guests with
  // is_plus_one are ones the household brought (edited in the form's
  // "Bringing a guest?" section, not shown as invited guests).
  plus_ones_allowed: number;
  guests: InvitationGuestDetail[];
  message_to_couple: string | null;
  song_request: string | null;
}

// PUT /rsvp/{token} request body.
export interface GuestRsvpSubmission {
  guest_id: string;
  status: RsvpStatus;
  meal_choice: string | null;
  dietary_notes: string | null;
}

// A guest the household is bringing; always attending. guest_id is set when
// editing one already saved, null for a new one.
export interface PlusOneSubmission {
  guest_id: string | null;
  full_name: string;
  meal_choice: string | null;
  dietary_notes: string | null;
}

export interface HouseholdRsvpSubmitRequest {
  responses: GuestRsvpSubmission[];
  // The household's full list of plus-ones: saved ones left out are
  // removed. Omit it to leave them unchanged.
  plus_ones?: PlusOneSubmission[];
  message_to_couple: string | null;
  song_request: string | null;
}
