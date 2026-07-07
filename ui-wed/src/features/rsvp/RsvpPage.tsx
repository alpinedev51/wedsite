import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Container from "../../components/ui/Container";
import Section from "../../components/ui/Section";
import Eyebrow from "../../components/ui/Eyebrow";
import { errorMessage } from "../../lib/api";
import RsvpForm from "./RsvpForm";
import { getInvitation, submitRsvp } from "./rsvp.api";
import type {
  HouseholdRsvpSubmitRequest,
  InvitationResponse,
} from "./rsvp.types";

// One magic link per HOUSEHOLD, not per guest (invite_token lives on
// Household, not Guest -- see service-wed's models/household.py) -- this
// page loads every guest in that household at once via the token in the
// URL, and RsvpForm submits all of their responses together in one PUT.
function RsvpPage() {
  const { token } = useParams<{ token: string }>();
  const [invitation, setInvitation] = useState<InvitationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // No synchronous setState here for the !token case (react-hooks/
    // set-state-in-effect) -- that's handled as its own render branch
    // below instead, before the loading/invitation UI.
    if (!token) return;
    let cancelled = false;
    getInvitation(token)
      .then((response) => {
        if (!cancelled) setInvitation(response);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(payload: HouseholdRsvpSubmitRequest) {
    if (!token) return;
    await submitRsvp(token, payload);
    setSaved(true);
  }

  if (!token) {
    return (
      <Section className="flex flex-col items-center">
        <Container className="max-w-2xl text-center">
          <p className="text-sm text-terracotta">
            This link is missing its invitation code.
          </p>
        </Container>
      </Section>
    );
  }

  return (
    <Section className="flex flex-col items-center">
      <Container className="flex max-w-2xl flex-col gap-8">
        <div className="text-center">
          <Eyebrow>RSVP</Eyebrow>
          <h1 className="text-3xl">
            {invitation ? invitation.display_name : "Your Invitation"}
          </h1>
        </div>

        {loading && <p className="text-center text-sm text-ink/70">Loading…</p>}

        {loadError && (
          <p className="text-center text-sm text-terracotta">{loadError}</p>
        )}

        {saved && (
          <p className="text-center text-olive2">
            Your RSVP has been saved -- thank you! You can come back to this
            same link any time before the deadline to make changes.
          </p>
        )}

        {invitation && (
          <RsvpForm invitation={invitation} onSubmit={handleSubmit} />
        )}
      </Container>
    </Section>
  );
}

export default RsvpPage;
