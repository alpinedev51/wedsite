import { createContext, useContext } from "react";

// The context lives here, apart from AuthProvider, so that file exports only
// a component (which React's hot reload needs).

// "checking" is the initial state while the mount-time probe (in AuthProvider) is in
// flight -- RequireAdmin shows a loading state for it instead of redirecting,
// so a page reload doesn't briefly flash the login screen for an already
// logged-in admin.
export type AuthStatus = "checking" | "authenticated" | "anonymous";

export interface AuthContextValue {
  status: AuthStatus;
  markAuthenticated: () => void;
  markAnonymous: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
