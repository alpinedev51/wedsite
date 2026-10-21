import type { ReactNode } from "react";
import Section from "../../components/ui/Section";
import ComingSoon from "../../pages/ComingSoon";
import { useWeddingConfig } from "../../config/WeddingConfigContext";
import { formatLongDate } from "../../lib/date";

// Wraps the RSVP pages: before the wedding's RSVP opening time (set in the
// admin Wedding tab), guests see "Coming soon" instead of the form. With no
// opening time set, RSVPs are open. The backend rejects early RSVPs anyway;
// this just tells guests up front.
function RsvpGate({ children }: { children: ReactNode }) {
  const { wedding, loaded, rsvpOpen } = useWeddingConfig();

  // Wait for the live config so the form never flashes before "Coming soon".
  if (!loaded) return <Section className="min-h-[60vh]">{null}</Section>;

  if (!rsvpOpen && wedding.rsvpOpensAt) {
    return (
      <ComingSoon
        title="RSVP"
        note={`RSVPs open ${formatLongDate(wedding.rsvpOpensAt)}.`}
      />
    );
  }
  return <>{children}</>;
}

export default RsvpGate;
