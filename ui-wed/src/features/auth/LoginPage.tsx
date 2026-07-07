import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Container from "../../components/ui/Container";
import Section from "../../components/ui/Section";
import Eyebrow from "../../components/ui/Eyebrow";
import { Button } from "../../components/ui/Button";
import { ApiError } from "../../lib/api";
import { login } from "./auth.api";
import { useAuth } from "./AuthContext";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { markAuthenticated } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password });
      markAuthenticated();
      navigate("/admin/guests", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Section className="flex min-h-[70vh] flex-col items-center justify-center">
      <Container className="flex max-w-sm flex-col gap-6">
        <div className="text-center">
          <Eyebrow>Admin</Eyebrow>
          <h1 className="text-3xl">Log In</h1>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-ink">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded border border-walnut/30 bg-linen px-3 py-2"
              autoComplete="username"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink">
            Password
            <input
              type="password"
              required
              minLength={8} // matches AdminLoginRequest.password's min_length in service-wed
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded border border-walnut/30 bg-linen px-3 py-2"
              autoComplete="current-password"
            />
          </label>
          {error && <p className="text-sm text-terracotta">{error}</p>}
          <Button type="submit" disabled={submitting}>
            {submitting ? "Logging in…" : "Log In"}
          </Button>
        </form>
      </Container>
    </Section>
  );
}

export default LoginPage;
