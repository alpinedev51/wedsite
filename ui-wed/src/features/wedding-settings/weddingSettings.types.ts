// Mirrors service-wed/src/service_wed/schemas/wedding.py::WeddingAdminView
// and WeddingUpsertRequest -- keep these in sync if those backend DTOs
// change shape. All datetimes are ISO strings (UTC) over the wire; the
// admin form converts to/from <input type="datetime-local"> via
// lib/date.ts's toDatetimeLocalInput/fromDatetimeLocalInput (venue time).
export interface WeddingAdminView {
  wedding_date: string;
  venue_name: string | null;
  venue_address: string | null;
  venue_city: string | null;
  bride_first_name: string | null;
  groom_first_name: string | null;
  rsvp_opens_at: string | null;
  rsvp_deadline: string;
  reminder_cap: number;
  reminder_interval_days: number;
}

export interface WeddingUpsertRequest {
  wedding_date: string;
  rsvp_deadline: string;
  rsvp_opens_at?: string | null;
  reminder_cap?: number;
  reminder_interval_days?: number;
  venue_name?: string | null;
  venue_address?: string | null;
  venue_city?: string | null;
  bride_first_name?: string | null;
  groom_first_name?: string | null;
}
