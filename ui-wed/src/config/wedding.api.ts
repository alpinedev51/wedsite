import { apiFetch } from "../lib/api";
import type { Schemas } from "../types";

// All datetimes are UTC ISO strings over the wire.
export type WeddingPublicView = Schemas["WeddingPublicView"];

// Unauthenticated -- backs the public site's countdown/venue/RSVP display.
// 404s (as an ApiError with code "not_found") until the couple has saved a
// wedding config through the admin UI at least once; callers should treat
// that the same as any other fetch failure and fall back to config/wedding.ts.
export function getWeddingPublic(): Promise<WeddingPublicView> {
  return apiFetch("/wedding");
}
