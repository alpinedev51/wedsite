import { useCallback, useEffect, useState, type ReactNode } from "react";
import { apiFetch, ApiError } from "../../lib/api";
import { AuthContext, type AuthStatus } from "./useAuth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("checking");

  useEffect(() => {
    let cancelled = false;
    apiFetch("/admin/wedding")
      .then(() => {
        if (!cancelled) setStatus("authenticated");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStatus(
          err instanceof ApiError && err.status === 401
            ? "anonymous"
            : "authenticated",
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Called directly by LoginPage/AdminPage after a successful
  // login/logout request, so the UI updates immediately instead of waiting
  // on another round-trip to re-probe /admin/wedding.
  const markAuthenticated = useCallback(() => setStatus("authenticated"), []);
  const markAnonymous = useCallback(() => setStatus("anonymous"), []);

  return (
    <AuthContext.Provider value={{ status, markAuthenticated, markAnonymous }}>
      {children}
    </AuthContext.Provider>
  );
}
