import { apiFetch } from "../../lib/api";
import type { AdminLoginRequest, SuccessResponse } from "./auth.types";

// Neither call returns a token -- the backend sets/clears the session as an
// httponly cookie on the response, which `apiFetch`'s `credentials: "include"`
// already handles. Callers just need to react to success/failure (see
// AuthContext.markAuthenticated/markAnonymous).
export function login(payload: AdminLoginRequest): Promise<SuccessResponse> {
  return apiFetch<SuccessResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function logout(): Promise<SuccessResponse> {
  return apiFetch<SuccessResponse>("/auth/logout", { method: "POST" });
}
