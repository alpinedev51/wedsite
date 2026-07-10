import { apiFetch } from "../lib/api";

// Mirrors service-wed/src/service_wed/schemas/wedding.py::WeddingPublicView.
// All datetimes are ISO strings (UTC) over the wire.
export interface WeddingPublicView {
  wedding_date: string;
  venue_name: string | null;
  venue_address: string | null;
  venue_city: string | null;
  bride_first_name: string | null;
  groom_first_name: string | null;
  rsvp_opens_at: string | null;
  rsvp_deadline: string;
}

// Unauthenticated -- backs the public site's countdown/venue/RSVP display.
// 404s (as an ApiError with code "not_found") until the couple has saved a
// wedding config through the admin UI at least once; callers should treat
// that the same as any other fetch failure and fall back to config/wedding.ts.
export function getWeddingPublic(): Promise<WeddingPublicView> {
  return apiFetch("/wedding");
}
