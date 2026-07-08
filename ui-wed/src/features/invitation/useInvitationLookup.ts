import { useState } from "react";
import { ApiError } from "../../lib/api";
import { recoverMagicLink } from "./invitation.api";

// Backs FindInvitationPage's form. Kept separate from the page component
// the same way RsvpPage/RsvpForm split load-vs-submit state, even though
// this feature only has the one form.
export function useInvitationLookup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      await recoverMagicLink({ full_name: fullName, email });
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError("Too many requests -- please try again in a few minutes.");
      } else if (err instanceof ApiError) {
        setError(err.message || "Something went wrong.");
      } else {
        setError("Something went wrong.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return {
    fullName,
    setFullName,
    email,
    setEmail,
    submitting,
    error,
    submitted,
    submit,
  };
}
