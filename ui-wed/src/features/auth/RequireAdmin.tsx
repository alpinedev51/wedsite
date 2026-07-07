import { Navigate, Outlet } from "react-router-dom";
import Section from "../../components/ui/Section";
import Container from "../../components/ui/Container";
import { useAuth } from "./AuthContext";

// Route guard for everything under /admin except /admin/login. Nest any
// new admin-only route under this element in router.tsx to get the same
// login redirect for free.
function RequireAdmin() {
  const { status } = useAuth();

  if (status === "checking") {
    return (
      <Section className="flex min-h-[60vh] items-center justify-center">
        <Container className="text-center text-ink/70">Loading…</Container>
      </Section>
    );
  }

  if (status === "anonymous") {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}

export default RequireAdmin;
