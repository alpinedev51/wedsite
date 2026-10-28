import { useRef, useState, type FormEvent } from "react";
import { Button } from "../../components/ui/Button";
import type {
  GuestRsvpSubmission,
  HouseholdRsvpSubmitRequest,
  InvitationResponse,
  PlusOneSubmission,
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

// A guest the household is bringing. They're always attending, so there's
// no status; `key` is a stable React key, since a new one has no guestId.
interface PlusOneFormState {
  key: string;
  guestId: string | null;
  fullName: string;
  mealChoice: string;
  dietaryNotes: string;
}

const STATUS_OPTIONS: { value: RsvpStatus; label: string }[] = [
  { value: "attending", label: "Joyfully Attending" },
  { value: "declined", label: "Regretfully Declining" },
  { value: "waiting", label: "Not Sure Yet" },
];

const inputClasses = "rounded border border-walnut/30 bg-linen px-3 py-2";

// Guests the household brought (is_plus_one) are edited in the plus-one
// section, but only when the invitation allows bringing someone. A guest
// the couple listed with IsPlusOne on an invitation that doesn't (e.g.
// "Guest of Ann") is answered for like anyone else -- the backend splits
// them the same way (service-wed services/rsvp.py _brought_plus_ones).
function isBroughtPlusOne(
  invitation: InvitationResponse,
  guest: InvitationResponse["guests"][number],
): boolean {
  return invitation.plus_ones_allowed > 0 && guest.is_plus_one;
}

function buildInitialGuestState(
  invitation: InvitationResponse,
): GuestFormState[] {
  // Every field pre-fills from a prior submission. Submitting replaces all
  // of them, so a field that started blank would erase the saved value.
  return invitation.guests
    .filter((guest) => !isBroughtPlusOne(invitation, guest))
    .map((guest) => ({
      guestId: guest.id,
      fullName: guest.full_name,
      status: guest.rsvp_status ?? "",
      mealChoice: guest.meal_choice ?? "",
      dietaryNotes: guest.dietary_notes ?? "",
    }));
}

function buildInitialPlusOneState(
  invitation: InvitationResponse,
): PlusOneFormState[] {
  return invitation.guests
    .filter((guest) => isBroughtPlusOne(invitation, guest))
    .map((guest) => ({
      key: guest.id,
      guestId: guest.id,
      fullName: guest.full_name,
      mealChoice: guest.meal_choice ?? "",
      dietaryNotes: guest.dietary_notes ?? "",
    }));
}

// One form for the whole household -- every guest in `invitation.guests`
// gets their own status/meal/dietary fields, submitted together in one
// PUT (see rsvp.api.ts's submitRsvp). This is deliberate, not a limitation:
// the backend already upserts each guest's RsvpResponse independently by
// their own guest_id, so a household of 3 can submit 2 attending + 1
// declined in the same call. Guests the household brings are sent as
// plus_ones in the same PUT; whoever fills in the form owns their details.
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
  const [savedPlusOnes] = useState<PlusOneFormState[]>(() =>
    buildInitialPlusOneState(invitation),
  );
  const [plusOnes, setPlusOnes] = useState<PlusOneFormState[]>(savedPlusOnes);
  const [bringing, setBringing] = useState(savedPlusOnes.length > 0);
  const [messageToCouple, setMessageToCouple] = useState(
    invitation.message_to_couple ?? "",
  );
  const [songRequest, setSongRequest] = useState(invitation.song_request ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextKey = useRef(0);

  function updateGuest(guestId: string, patch: Partial<GuestFormState>) {
    setGuests((current) =>
      current.map((guest) =>
        guest.guestId === guestId ? { ...guest, ...patch } : guest,
      ),
    );
  }

  function updatePlusOne(key: string, patch: Partial<PlusOneFormState>) {
    setPlusOnes((current) =>
      current.map((p) => (p.key === key ? { ...p, ...patch } : p)),
    );
  }

  function newPlusOne(): PlusOneFormState {
    nextKey.current += 1;
    return {
      key: `new-${nextKey.current}`,
      guestId: null,
      fullName: "",
      mealChoice: "",
      dietaryNotes: "",
    };
  }

  function handleBringingChange(value: boolean) {
    setBringing(value);
    // Typed details are kept while switching back and forth; only what's
    // showing when the form is submitted is sent.
    if (value && plusOnes.length === 0) setPlusOnes([newPlusOne()]);
  }

  function removePlusOne(key: string) {
    const remaining = plusOnes.filter((p) => p.key !== key);
    setPlusOnes(remaining);
    if (remaining.length === 0) setBringing(false);
  }

  // Still allows editing every saved plus-one if the couple lowered the
  // allowance after they were added (the backend allows the same).
  const maxPlusOnes = Math.max(
    invitation.plus_ones_allowed,
    savedPlusOnes.length,
  );
  const anyoneAttending = guests.some((guest) => guest.status === "attending");
  // A plus-one comes with someone who's attending.
  const showPlusOnes = maxPlusOnes > 0 && anyoneAttending;
  const sendingPlusOnes = showPlusOnes && bringing ? plusOnes : [];
  const removedNames = savedPlusOnes
    .filter((saved) => !sendingPlusOnes.some((p) => p.key === saved.key))
    .map((saved) => saved.fullName);

  const allAnswered = guests.every((guest) => guest.status !== "");
  const plusOnesNamed = sendingPlusOnes.every((p) => p.fullName.trim() !== "");
  const canSubmit = allAnswered && plusOnesNamed;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
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
      const plus_ones: PlusOneSubmission[] = sendingPlusOnes.map((p) => ({
        guest_id: p.guestId,
        full_name: p.fullName.trim(),
        meal_choice: p.mealChoice || null,
        dietary_notes: p.dietaryNotes || null,
      }));
      await onSubmit({
        responses,
        // Left out for invitations without plus-ones, so nothing about
        // them changes on the backend.
        ...(maxPlusOnes > 0 ? { plus_ones } : {}),
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
                    className={inputClasses}
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
                    className={inputClasses}
                  />
                </label>
              </div>
            )}
          </div>
        ))}
      </div>

      {showPlusOnes && (
        <fieldset className="flex flex-col gap-4 rounded-2xl border border-walnut/15 bg-linen/60 p-6">
          <legend className="px-2 font-display text-xl text-walnut">
            {maxPlusOnes === 1 ? "Bringing a guest?" : "Bringing guests?"}
          </legend>
          <p className="text-sm text-ink/70">
            {maxPlusOnes === 1
              ? "You're welcome to bring a guest."
              : `You're welcome to bring up to ${maxPlusOnes} guests.`}{" "}
            You can come back to this page to change their details.
          </p>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                name="bringing-guest"
                checked={bringing}
                onChange={() => handleBringingChange(true)}
              />
              Yes
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                name="bringing-guest"
                checked={!bringing}
                onChange={() => handleBringingChange(false)}
              />
              No
            </label>
          </div>

          {bringing &&
            plusOnes.map((plusOne) => (
              <div
                key={plusOne.key}
                className="flex flex-col gap-4 border-t border-walnut/10 pt-4"
              >
                <label className="flex flex-col gap-1 text-sm text-ink">
                  Guest&rsquo;s Full Name
                  <input
                    type="text"
                    required
                    maxLength={255}
                    value={plusOne.fullName}
                    onChange={(e) =>
                      updatePlusOne(plusOne.key, { fullName: e.target.value })
                    }
                    className={inputClasses}
                  />
                </label>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm text-ink">
                    Meal Choice
                    <input
                      type="text"
                      value={plusOne.mealChoice}
                      onChange={(e) =>
                        updatePlusOne(plusOne.key, {
                          mealChoice: e.target.value,
                        })
                      }
                      className={inputClasses}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm text-ink">
                    Dietary Notes
                    <input
                      type="text"
                      value={plusOne.dietaryNotes}
                      onChange={(e) =>
                        updatePlusOne(plusOne.key, {
                          dietaryNotes: e.target.value,
                        })
                      }
                      className={inputClasses}
                    />
                  </label>
                </div>
                {maxPlusOnes > 1 && (
                  <button
                    type="button"
                    onClick={() => removePlusOne(plusOne.key)}
                    className="w-fit text-sm text-terracotta underline"
                  >
                    Remove this guest
                  </button>
                )}
              </div>
            ))}

          {bringing && plusOnes.length < invitation.plus_ones_allowed && (
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setPlusOnes((current) => [...current, newPlusOne()])
              }
              className="w-fit"
            >
              Add another guest
            </Button>
          )}
        </fieldset>
      )}

      {removedNames.length > 0 && (
        <p className="text-sm text-ink/70">
          {anyoneAttending
            ? `Submitting will remove ${removedNames.join(", ")} from your RSVP.`
            : `Since no one on this invitation is attending, submitting will remove ${removedNames.join(", ")} from your RSVP.`}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm text-ink">
        Song Request
        <input
          type="text"
          value={songRequest}
          onChange={(e) => setSongRequest(e.target.value)}
          className={inputClasses}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-ink">
        Message to the Couple
        <textarea
          value={messageToCouple}
          onChange={(e) => setMessageToCouple(e.target.value)}
          rows={4}
          className={inputClasses}
        />
      </label>

      {error && <p className="text-sm text-terracotta">{error}</p>}
      {!allAnswered && (
        <p className="text-sm text-ink/70">
          Please choose a response for everyone in your household before
          submitting.
        </p>
      )}
      {allAnswered && !plusOnesNamed && (
        <p className="text-sm text-ink/70">
          Please enter your guest&rsquo;s full name before submitting.
        </p>
      )}

      <Button
        type="submit"
        disabled={!canSubmit || submitting}
        className="w-fit"
      >
        {submitting ? "Submitting…" : "Submit RSVP"}
      </Button>
    </form>
  );
}

export default RsvpForm;
