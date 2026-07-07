// Mirrors service-wed's domain/value_objects.py::RsvpStatus and
// schemas/household.py + schemas/common.py::Page -- keep these in sync if
// those backend types change shape.
export type RsvpStatus = "attending" | "declined" | "waiting";

export interface GuestAdminView {
  id: string;
  full_name: string;
  email: string | null;
  is_plus_one: boolean;
  rsvp_status: RsvpStatus | null;
  meal_choice: string | null;
}

export interface HouseholdAdminView {
  id: string;
  display_name: string;
  contact_email: string | null;
  invite_token: string;
  guests: GuestAdminView[];
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface GuestImportResponse {
  success: boolean;
  message: string;
  warnings: string[];
}
