import { apiDownload, apiFetch } from "../../lib/api";
import type {
  GuestImportResponse,
  HouseholdAdminView,
  Page,
} from "./guestList.types";

// 200 covers "a few hundred rows at most" (see service-wed's Page
// docstring) in one request -- the guest list page renders it as a single
// flat table rather than paginating, so there's no reason to fetch less.
export function listHouseholds(
  limit = 200,
  offset = 0,
): Promise<Page<HouseholdAdminView>> {
  return apiFetch(`/admin/households?limit=${limit}&offset=${offset}`);
}

// Re-uploading is safe on the backend (guests are matched/updated by name
// within a household, not duplicated), so this same call covers both the
// first import and any later edit-and-re-upload cycle.
export function importGuestListCsv(file: File): Promise<GuestImportResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch("/admin/households/import", {
    method: "POST",
    body: formData,
  });
}

/** Streams the guests.csv export and triggers a browser download. */
export async function downloadGuestListCsv(): Promise<void> {
  const blob = await apiDownload("/admin/exports/guests.csv");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "guests.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
