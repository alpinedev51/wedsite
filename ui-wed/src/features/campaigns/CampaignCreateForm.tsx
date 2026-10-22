import { useState, type FormEvent } from "react";
import { Button } from "../../components/ui/Button";
import { errorMessage } from "../../lib/api";
import { fromDatetimeLocalInput } from "../../lib/date";
import { createCampaign } from "./campaigns.api";
import type { CampaignAdminView, CampaignType } from "./campaigns.types";

// "reminder" excluded on purpose -- see campaigns.types.ts's CampaignType
// comment. template_key isn't a separate field: the five shipped email
// templates match CampaignType's values 1:1 (service-wed README), so it's
// just set equal to `type` at submit time instead of asking the admin to
// hand-type a key that has to match a template filename exactly.
const CAMPAIGN_TYPE_OPTIONS: { value: CampaignType; label: string }[] = [
  { value: "save_the_date", label: "Save the Date" },
  { value: "rsvp_invite", label: "RSVP Invite" },
  { value: "final_details", label: "Final Details" },
  { value: "thank_you", label: "Thank You" },
];

function CampaignCreateForm({
  onCreated,
  onCancel,
}: {
  onCreated: (campaign: CampaignAdminView) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<CampaignType>("save_the_date");
  const [subject, setSubject] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const campaign = await createCampaign({
        type,
        subject,
        template_key: type,
        scheduled_for: fromDatetimeLocalInput(scheduledFor),
      });
      onCreated(campaign);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-walnut/12 bg-linen/60 p-6"
    >
      <h3 className="text-lg">New Campaign</h3>

      <label className="flex flex-col gap-1 text-sm text-ink">
        Type
        <select
          value={type}
          onChange={(e) => setType(e.target.value as CampaignType)}
          className="rounded border border-walnut/30 bg-linen px-3 py-2"
        >
          {CAMPAIGN_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-ink">
        Subject
        <input
          type="text"
          required
          maxLength={255}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="rounded border border-walnut/30 bg-linen px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-ink">
        Scheduled For (venue time)
        <input
          type="datetime-local"
          required
          value={scheduledFor}
          onChange={(e) => setScheduledFor(e.target.value)}
          className="rounded border border-walnut/30 bg-linen px-3 py-2"
        />
      </label>

      {error && <p className="text-sm text-terracotta">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting} className="w-fit">
          {submitting ? "Creating…" : "Create Draft"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          className="w-fit"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default CampaignCreateForm;
