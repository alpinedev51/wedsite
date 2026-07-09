import type { FormEvent } from "react";
import Container from "../../components/ui/Container";
import Section from "../../components/ui/Section";
import Eyebrow from "../../components/ui/Eyebrow";
import { Button } from "../../components/ui/Button";
import { useInvitationLookup } from "./useInvitationLookup";

// Guests only ever get their magic link via email (rsvp/:token), so anyone
// who lost or never opened that email lands here instead -- collects
// name+email and asks the backend to resend the link (POST
// /invitations/recover). The response is deliberately the same whether or
// not anything matched, so this page never reveals whether an email is on
// the guest list.
function FindInvitationPage() {
  const {
    fullName,
    setFullName,
    email,
    setEmail,
    submitting,
    error,
    submitted,
    submit,
  } = useInvitationLookup();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submit();
  }

  return (
    <Section className="flex min-h-[60vh] flex-col items-center justify-center">
      <Container className="flex max-w-sm flex-col gap-6">
        <div className="text-center">
          <Eyebrow>RSVP</Eyebrow>
          <h1 className="text-3xl">Find Your Invitation</h1>
          <p className="mt-2 text-sm text-ink/70">
            Enter the name and email your invitation was addressed to, and we'll
            send your RSVP link.
          </p>
        </div>

        {submitted ? (
          <p className="text-center text-olive2">
            If that name and email match an invitation, a link has been sent --
            check your inbox in a few minutes.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm text-ink">
              Full Name
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="rounded border border-walnut/30 bg-linen px-3 py-2"
                autoComplete="name"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-ink">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded border border-walnut/30 bg-linen px-3 py-2"
                autoComplete="email"
              />
            </label>
            {error && <p className="text-sm text-terracotta">{error}</p>}
            <Button type="submit" disabled={submitting}>
              {submitting ? "Sending…" : "Send My RSVP Link"}
            </Button>
          </form>
        )}
      </Container>
    </Section>
  );
}

export default FindInvitationPage;
