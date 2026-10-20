import { useCallback, useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { errorMessage } from "../../lib/api";
import { formatVenueDateTime } from "../../lib/date";
import CampaignCreateForm from "./CampaignCreateForm";
import CampaignDetail from "./CampaignDetail";
import { listCampaigns } from "./campaigns.api";
import type { CampaignAdminView } from "./campaigns.types";

const TYPE_LABELS: Record<string, string> = {
  save_the_date: "Save the Date",
  rsvp_invite: "RSVP Invite",
  reminder: "Reminder",
  final_details: "Final Details",
  thank_you: "Thank You",
};

function CampaignsSection() {
  const [campaigns, setCampaigns] = useState<CampaignAdminView[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Used after create/reschedule/fan-out (all click-handler-triggered, so a
  // synchronous setState at the top here is fine -- see GuestListSection's
  // refreshHouseholds for why this needs to be separate from the mount
  // effect below).
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await listCampaigns();
      setCampaigns(page.items);
      setTotal(page.total);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    listCampaigns()
      .then((page) => {
        if (cancelled) return;
        setCampaigns(page.items);
        setTotal(page.total);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleCreated(campaign: CampaignAdminView) {
    setCreating(false);
    setSelectedId(campaign.id);
    refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl">Campaigns ({total})</h2>
        <Button
          variant="secondary"
          onClick={() => setCreating((v) => !v)}
          className="w-fit"
        >
          {creating ? "Cancel" : "New Campaign"}
        </Button>
      </div>

      {creating && (
        <CampaignCreateForm
          onCreated={handleCreated}
          onCancel={() => setCreating(false)}
        />
      )}

      {loading && <p className="text-sm text-ink/70">Loading…</p>}
      {error && <p className="text-sm text-terracotta">{error}</p>}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-walnut/20 font-utility uppercase tracking-wider text-ink/70">
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Subject</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Scheduled For</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr
                  key={campaign.id}
                  onClick={() => setSelectedId(campaign.id)}
                  className="cursor-pointer border-b border-walnut/10 hover:bg-walnut/5"
                >
                  <td className="py-2 pr-4">
                    {TYPE_LABELS[campaign.type] ?? campaign.type}
                  </td>
                  <td className="py-2 pr-4">{campaign.subject}</td>
                  <td className="py-2 pr-4 capitalize">{campaign.status}</td>
                  <td className="py-2 pr-4">
                    {formatVenueDateTime(new Date(campaign.scheduled_for))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedId && (
        <CampaignDetail
          campaignId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={refresh}
        />
      )}
    </div>
  );
}

export default CampaignsSection;
