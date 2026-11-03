import type { Schemas } from "../../types";

export type { RsvpStatus } from "../guests/guestList.types";
export type { SuccessResponse } from "../../types";

// GET /rsvp/{token}: pre-fills the form with the household's saved answers.
// When plus_ones_allowed > 0, guests with is_plus_one are ones the household
// brought (edited in the form's "Bringing a guest?" section).
export type InvitationGuestDetail = Schemas["InvitationGuestDetail"];
export type InvitationResponse = Schemas["InvitationResponse"];

// PUT /rsvp/{token}. plus_ones is the household's full list: saved ones left
// out are removed, and omitting the field leaves them unchanged. A plus-one's
// guest_id is null for a new one.
export type GuestRsvpSubmission = Schemas["GuestRsvpSubmission"];
export type PlusOneSubmission = Schemas["PlusOneSubmission"];
export type HouseholdRsvpSubmitRequest = Schemas["HouseholdRsvpSubmitRequest"];
