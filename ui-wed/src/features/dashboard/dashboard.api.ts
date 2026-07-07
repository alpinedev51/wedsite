import { apiFetch } from "../../lib/api";
import type { DashboardResponse } from "./dashboard.types";

// One GET, backed entirely by grouped-count queries on the backend (see
// service-wed's services/dashboard.py) -- cheap regardless of how many
// guests/campaigns exist, so it's safe to call fresh on every visit to
// this tab rather than caching it client-side.
export function getDashboard(): Promise<DashboardResponse> {
  return apiFetch("/admin/dashboard");
}
