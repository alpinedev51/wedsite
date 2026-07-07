import { useEffect, useState, type FormEvent } from "react";
import { Button } from "../../components/ui/Button";
import { errorMessage } from "../../lib/api";
import { fromDatetimeLocalInput, toDatetimeLocalInput } from "../../lib/date";
import {
  fanOutCampaign,
  getCampaign,
  rescheduleCampaign,
} from "./campaigns.api";
import type { CampaignAdminView } from "./campaigns.types";

const TYPE_LABELS: Record<string, string> = {
  save_the_date: "Save the Date",
  rsvp_invite: "RSVP Invite",
  reminder: "Reminder",
  final_details: "Final Details",
  thank_you: "Thank You",
};

function CampaignDetail({
  campaignId,
  onClose,
  onUpdated,
}: {
  campaignId: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [campaign, setCampaign] = useState<CampaignAdminView | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [rescheduleValue, setRescheduleValue] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const [fanningOut, setFanningOut] = useState(false);
  const [fanOutError, setFanOutError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCampaign(campaignId)
      .then((c) => {
        if (cancelled) return;
        setCampaign(c);
        setRescheduleValue(toDatetimeLocalInput(c.scheduled_for));
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
  }, [campaignId]);

  async function handleReschedule(e: FormEvent) {
    e.preventDefault();
    setRescheduling(true);
    setRescheduleError(null);
    try {
      const updated = await rescheduleCampaign(campaignId, {
        scheduled_for: fromDatetimeLocalInput(rescheduleValue),
      });
      setCampaign(updated);
      onUpdated();
    } catch (err) {
      setRescheduleError(errorMessage(err));
    } finally {
      setRescheduling(false);
    }
  }

  async function handleFanOut() {
    // No unfan-out/cancel endpoint exists once this succeeds (see
    // campaigns.api.ts's fanOutCampaign comment) -- a plain confirm() is
    // enough friction for a one-admin tool, no need for a custom dialog.
    const confirmed = window.confirm(
      "Fan out this campaign now? This queues an email for every household " +
        "with a contact email and can't be undone from here.",
    );
    if (!confirmed) return;

    setFanningOut(true);
    setFanOutError(null);
    try {
      const updated = await fanOutCampaign(campaignId);
      setCampaign(updated);
      onUpdated();
    } catch (err) {
      setFanOutError(errorMessage(err));
    } finally {
      setFanningOut(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-walnut/12 bg-linen/60 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg">Campaign Detail</h3>
        <Button variant="secondary" onClick={onClose} className="w-fit">
          Close
        </Button>
      </div>

      {loading && <p className="text-sm text-ink/70">Loading…</p>}
      {loadError && <p className="text-sm text-terracotta">{loadError}</p>}

      {campaign && (
        <>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <dt className="text-ink/60">Type</dt>
            <dd>{TYPE_LABELS[campaign.type] ?? campaign.type}</dd>
            <dt className="text-ink/60">Subject</dt>
            <dd>{campaign.subject}</dd>
            <dt className="text-ink/60">Status</dt>
            <dd className="capitalize">{campaign.status}</dd>
            <dt className="text-ink/60">Scheduled For</dt>
            <dd>{new Date(campaign.scheduled_for).toLocaleString()}</dd>
          </dl>

          {campaign.status === "draft" ? (
            <form
              onSubmit={handleReschedule}
              className="flex flex-col gap-3 border-t border-walnut/15 pt-4"
            >
              <label className="flex flex-col gap-1 text-sm text-ink">
                Reschedule
                <input
                  type="datetime-local"
                  required
                  value={rescheduleValue}
                  onChange={(e) => setRescheduleValue(e.target.value)}
                  className="rounded border border-walnut/30 bg-linen px-3 py-2"
                />
              </label>
              {rescheduleError && (
                <p className="text-sm text-terracotta">{rescheduleError}</p>
              )}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={rescheduling}
                  className="w-fit"
                >
                  {rescheduling ? "Saving…" : "Save New Time"}
                </Button>
                <Button
                  type="button"
                  onClick={handleFanOut}
                  disabled={fanningOut}
                  className="w-fit"
                >
                  {fanningOut ? "Fanning Out…" : "Fan Out Now"}
                </Button>
              </div>
              {fanOutError && (
                <p className="text-sm text-terracotta">{fanOutError}</p>
              )}
            </form>
          ) : (
            <p className="border-t border-walnut/15 pt-4 text-sm text-ink/70">
              This status won't progress past "scheduled" here even after it
              actually sends -- service-wed never assigns sending/sent to a
              campaign row. Check delivery counts on the Dashboard (once built)
              or the exported guest CSV for real send state.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default CampaignDetail;
