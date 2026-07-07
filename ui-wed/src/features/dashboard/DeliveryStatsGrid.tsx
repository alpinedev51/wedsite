import StatTile from "./StatTile";
import type { DeliveryStatsResponse } from "./dashboard.types";

// Reused by both the global Dashboard tab (every message ever sent) and a
// single campaign's detail view (that campaign's messages only, via
// GET /admin/campaigns/{id}'s `delivery` field). See service-wed's
// CampaignDetailView docstring for why a live per-campaign breakdown like
// this -- not a rolled-up campaign.status -- is the honest answer to "did
// this send actually go out."
//
// "Sent" is the good outcome; "Failed"/"Bounced"/"Complained" are the ones
// worth the admin's attention (a bounced wedding invite is worth knowing
// about), so those get the status accent colors -- "Scheduled"/"Sending"/
// "Canceled" are just in-progress/inactive states, not good or bad, so they
// stay neutral.
function DeliveryStatsGrid({ delivery }: { delivery: DeliveryStatsResponse }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatTile label="Scheduled" value={delivery.scheduled} />
      <StatTile label="Sending" value={delivery.sending} />
      <StatTile label="Sent" value={delivery.sent} accent="good" />
      <StatTile label="Failed" value={delivery.failed} accent="critical" />
      <StatTile label="Canceled" value={delivery.canceled} />
      <StatTile label="Bounced" value={delivery.bounced} accent="critical" />
      <StatTile
        label="Complained"
        value={delivery.complained}
        accent="critical"
      />
    </div>
  );
}

export default DeliveryStatsGrid;
