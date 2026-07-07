import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, ApiError } from "../../lib/api";

// "checking" is the initial state while the mount-time probe (below) is in
// flight -- RequireAdmin shows a loading state for it instead of redirecting,
// so a page reload doesn't briefly flash the login screen for an already
// logged-in admin.
type AuthStatus = "checking" | "authenticated" | "anonymous";

interface AuthContextValue {
  status: AuthStatus;
  markAuthenticated: () => void;
  markAnonymous: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

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

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
