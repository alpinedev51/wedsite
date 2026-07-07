import { useEffect, useState, type FormEvent } from "react";
import { Button } from "../../components/ui/Button";
import { ApiError, errorMessage } from "../../lib/api";
import { fromDatetimeLocalInput, toDatetimeLocalInput } from "../../lib/date";
import { getWeddingAdmin, upsertWedding } from "./weddingSettings.api";
import type { WeddingAdminView } from "./weddingSettings.types";

interface FormState {
  weddingDate: string;
  rsvpOpensAt: string;
  rsvpDeadline: string;
  reminderCap: number;
  reminderIntervalDays: number;
  venueName: string;
  venueAddress: string;
}

const BLANK_FORM: FormState = {
  weddingDate: "",
  rsvpOpensAt: "",
  rsvpDeadline: "",
  reminderCap: 2,
  reminderIntervalDays: 7,
  venueName: "",
  venueAddress: "",
};

function toFormState(wedding: WeddingAdminView): FormState {
  return {
    weddingDate: toDatetimeLocalInput(wedding.wedding_date),
    rsvpOpensAt: wedding.rsvp_opens_at
      ? toDatetimeLocalInput(wedding.rsvp_opens_at)
      : "",
    rsvpDeadline: toDatetimeLocalInput(wedding.rsvp_deadline),
    reminderCap: wedding.reminder_cap,
    reminderIntervalDays: wedding.reminder_interval_days,
    venueName: wedding.venue_name ?? "",
    venueAddress: wedding.venue_address ?? "",
  };
}

// This form is the single source of truth for wedding_date/rsvp_deadline/
// rsvp_opens_at -- the public site should read the same values back via
// GET /wedding rather than any hardcoded config, so a save here is
// immediately reflected there.
function WeddingSettingsSection() {
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Distinct from loadError: a 404 here just means the couple hasn't saved
  // a wedding config yet, not that anything is broken (see wedding.py's
  // public_router docstring -- same DomainError, same "not configured"
  // meaning on the admin side).
  const [notConfigured, setNotConfigured] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getWeddingAdmin()
      .then((wedding) => {
        if (cancelled) return;
        setForm(toFormState(wedding));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.code === "not_found") {
          setNotConfigured(true);
        } else {
          setLoadError(errorMessage(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const wedding = await upsertWedding({
        wedding_date: fromDatetimeLocalInput(form.weddingDate),
        rsvp_deadline: fromDatetimeLocalInput(form.rsvpDeadline),
        rsvp_opens_at: form.rsvpOpensAt
          ? fromDatetimeLocalInput(form.rsvpOpensAt)
          : null,
        reminder_cap: form.reminderCap,
        reminder_interval_days: form.reminderIntervalDays,
        venue_name: form.venueName || null,
        venue_address: form.venueAddress || null,
      });
      setNotConfigured(false);
      setForm(toFormState(wedding));
      setSaved(true);
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-ink/70">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-walnut/12 bg-linen/60 p-6">
      <h2 className="text-xl">Wedding Schedule</h2>
      {notConfigured && (
        <p className="text-sm text-ink/70">
          No wedding config saved yet &mdash; fill this in and save to make the
          public site's countdown/RSVP window live.
        </p>
      )}
      {loadError && <p className="text-sm text-terracotta">{loadError}</p>}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <label className="flex flex-col gap-1 text-sm text-ink">
          Wedding Date
          <input
            type="datetime-local"
            required
            value={form.weddingDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, weddingDate: e.target.value }))
            }
            className="rounded border border-walnut/30 bg-linen px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-ink">
          RSVP Deadline
          <input
            type="datetime-local"
            required
            value={form.rsvpDeadline}
            onChange={(e) =>
              setForm((f) => ({ ...f, rsvpDeadline: e.target.value }))
            }
            className="rounded border border-walnut/30 bg-linen px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-ink">
          RSVP Opens At (optional)
          <input
            type="datetime-local"
            value={form.rsvpOpensAt}
            onChange={(e) =>
              setForm((f) => ({ ...f, rsvpOpensAt: e.target.value }))
            }
            className="rounded border border-walnut/30 bg-linen px-3 py-2"
          />
        </label>

        <div />

        <label className="flex flex-col gap-1 text-sm text-ink">
          Venue Name
          <input
            type="text"
            value={form.venueName}
            onChange={(e) =>
              setForm((f) => ({ ...f, venueName: e.target.value }))
            }
            className="rounded border border-walnut/30 bg-linen px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-ink">
          Venue Address
          <input
            type="text"
            value={form.venueAddress}
            onChange={(e) =>
              setForm((f) => ({ ...f, venueAddress: e.target.value }))
            }
            className="rounded border border-walnut/30 bg-linen px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-ink">
          Reminder Cap
          <input
            type="number"
            min={0}
            required
            value={form.reminderCap}
            onChange={(e) =>
              setForm((f) => ({ ...f, reminderCap: Number(e.target.value) }))
            }
            className="rounded border border-walnut/30 bg-linen px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-ink">
          Reminder Interval (days)
          <input
            type="number"
            min={1}
            required
            value={form.reminderIntervalDays}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                reminderIntervalDays: Number(e.target.value),
              }))
            }
            className="rounded border border-walnut/30 bg-linen px-3 py-2"
          />
        </label>

        <div className="flex items-center gap-4 sm:col-span-2">
          <Button type="submit" disabled={saving} className="w-fit">
            {saving ? "Saving…" : "Save"}
          </Button>
          {saved && <span className="text-sm text-olive2">Saved.</span>}
        </div>
        {saveError && (
          <p className="text-sm text-terracotta sm:col-span-2">{saveError}</p>
        )}
      </form>
    </div>
  );
}

export default WeddingSettingsSection;
