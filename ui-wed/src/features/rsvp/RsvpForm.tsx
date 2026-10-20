import { useState, type FormEvent } from "react";
import { Button } from "../../components/ui/Button";
import type {
  GuestRsvpSubmission,
  HouseholdRsvpSubmitRequest,
  InvitationResponse,
  RsvpStatus,
} from "./rsvp.types";

interface GuestFormState {
  guestId: string;
  fullName: string;
  // "" is the unanswered sentinel -- a real <input type="radio"> group needs
  // a defined initial value, and defaulting a never-answered guest to e.g.
  // "attending" would risk silently submitting a status nobody actually
  // chose. Submit is disabled until every guest has a real RsvpStatus.
  status: RsvpStatus | "";
  mealChoice: string;
  dietaryNotes: string;
}

const STATUS_OPTIONS: { value: RsvpStatus; label: string }[] = [
  { value: "attending", label: "Joyfully Attending" },
  { value: "declined", label: "Regretfully Declining" },
  { value: "waiting", label: "Not Sure Yet" },
];

function buildInitialGuestState(
  invitation: InvitationResponse,
): GuestFormState[] {
  // meal_choice pre-fills from a prior submission; dietary_notes doesn't --
  // InvitationGuestDetail (the GET response) doesn't return it at all (see
  // rsvp.types.ts), only the PUT accepts it, so an edit starts that one
  // field blank even if something was saved before.
  return invitation.guests.map((guest) => ({
    guestId: guest.id,
    fullName: guest.full_name,
    status: guest.rsvp_status ?? "",
    mealChoice: guest.meal_choice ?? "",
    dietaryNotes: "",
  }));
}

// One form for the whole household -- every guest in `invitation.guests`
// gets their own status/meal/dietary fields, submitted together in one
// PUT (see rsvp.api.ts's submitRsvp). This is deliberate, not a limitation:
// the backend already upserts each guest's RsvpResponse independently by
// their own guest_id, so a household of 3 can submit 2 attending + 1
// declined in the same call.
function RsvpForm({
  invitation,
  onSubmit,
}: {
  invitation: InvitationResponse;
  onSubmit: (payload: HouseholdRsvpSubmitRequest) => Promise<void>;
}) {
  const [guests, setGuests] = useState<GuestFormState[]>(() =>
    buildInitialGuestState(invitation),
  );
  const [messageToCouple, setMessageToCouple] = useState("");
  const [songRequest, setSongRequest] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateGuest(guestId: string, patch: Partial<GuestFormState>) {
    setGuests((current) =>
      current.map((guest) =>
        guest.guestId === guestId ? { ...guest, ...patch } : guest,
      ),
    );
  }

  const allAnswered = guests.every((guest) => guest.status !== "");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!allAnswered) return;
    setSubmitting(true);
    setError(null);
    try {
      const responses: GuestRsvpSubmission[] = guests.map((guest) => ({
        guest_id: guest.guestId,
        status: guest.status as RsvpStatus,
        // No point asking a declined/undecided guest for a meal choice --
        // client-side UX only, the backend schema itself doesn't require
        // this correlation.
        meal_choice:
          guest.status === "attending" ? guest.mealChoice || null : null,
        dietary_notes:
          guest.status === "attending" ? guest.dietaryNotes || null : null,
      }));
      await onSubmit({
        responses,
        message_to_couple: messageToCouple || null,
        song_request: songRequest || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        {guests.map((guest) => (
          <div
            key={guest.guestId}
            className="flex flex-col gap-3 rounded-2xl border border-walnut/15 bg-linen/60 p-6"
          >
            <h3 className="font-display text-xl text-walnut">
              {guest.fullName}
            </h3>

            <div className="flex flex-wrap gap-4">
              {STATUS_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 text-sm text-ink"
                >
                  <input
                    type="radio"
                    name={`status-${guest.guestId}`}
                    value={option.value}
                    checked={guest.status === option.value}
                    onChange={() =>
                      updateGuest(guest.guestId, { status: option.value })
                    }
                  />
                  {option.label}
                </label>
              ))}
            </div>

            {guest.status === "attending" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm text-ink">
                  Meal Choice
                  <input
                    type="text"
                    value={guest.mealChoice}
                    onChange={(e) =>
                      updateGuest(guest.guestId, { mealChoice: e.target.value })
                    }
                    className="rounded border border-walnut/30 bg-linen px-3 py-2"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-ink">
                  Dietary Notes
                  <input
                    type="text"
                    value={guest.dietaryNotes}
                    onChange={(e) =>
                      updateGuest(guest.guestId, {
                        dietaryNotes: e.target.value,
                      })
                    }
                    className="rounded border border-walnut/30 bg-linen px-3 py-2"
                  />
                </label>
              </div>
            )}
          </div>
        ))}
      </div>

      <label className="flex flex-col gap-1 text-sm text-ink">
        Song Request
        <input
          type="text"
          value={songRequest}
          onChange={(e) => setSongRequest(e.target.value)}
          className="rounded border border-walnut/30 bg-linen px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-ink">
        Message to the Couple
        <textarea
          value={messageToCouple}
          onChange={(e) => setMessageToCouple(e.target.value)}
          rows={4}
          className="rounded border border-walnut/30 bg-linen px-3 py-2"
        />
      </label>

      {error && <p className="text-sm text-terracotta">{error}</p>}
      {!allAnswered && (
        <p className="text-sm text-ink/70">
          Please choose a response for everyone in your household before
          submitting.
        </p>
      )}

      <Button
        type="submit"
        disabled={!allAnswered || submitting}
        className="w-fit"
      >
        {submitting ? "Submitting…" : "Submit RSVP"}
      </Button>
    </form>
  );
}

export default RsvpForm;
