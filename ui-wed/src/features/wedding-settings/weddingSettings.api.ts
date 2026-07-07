import { apiFetch } from "../../lib/api";
import type {
  WeddingAdminView,
  WeddingUpsertRequest,
} from "./weddingSettings.types";

// 404s with a not_found DomainError until the couple has saved this once --
// callers should treat that as "not configured yet," not a real error (see
// WeddingSettingsSection).
export function getWeddingAdmin(): Promise<WeddingAdminView> {
  return apiFetch("/admin/wedding");
}

// Always a full upsert -- there's only ever one wedding row, so this both
// creates it the first time and updates it on every save after.
export function upsertWedding(
  payload: WeddingUpsertRequest,
): Promise<WeddingAdminView> {
  return apiFetch("/admin/wedding", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
