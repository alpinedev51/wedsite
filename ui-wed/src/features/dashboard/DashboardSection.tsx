import { useEffect, useState } from "react";
import { errorMessage } from "../../lib/api";
import DeliveryStatsGrid from "./DeliveryStatsGrid";
import StatTile from "./StatTile";
import { getDashboard } from "./dashboard.api";
import type { DashboardResponse } from "./dashboard.types";

// The admin's one-screen overview: a hero "days until the wedding" figure,
// then RSVP/household counts, then email delivery counts. Everything here
// is a current-moment snapshot with no history to plot, so per the dataviz
// skill's form guidance ("a handful of headline numbers" -> a KPI row of
// stat tiles, not a chart) this is plain labeled tiles, no chart marks.
function DashboardSection() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDashboard()
      .then((response) => {
        if (!cancelled) setData(response);
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

  if (loading) return <p className="text-sm text-ink/70">Loading…</p>;
  if (error) return <p className="text-sm text-terracotta">{error}</p>;
  if (!data) return null;

  const { rsvp, delivery } = data;

  return (
    <div className="flex flex-col gap-8">
      {/* The one number this dashboard leads with -- a hero figure per the
          dataviz skill (large, same sans as everything else, exactly one
          per view), not folded in as just another stat tile. */}
      <div className="rounded-2xl border border-walnut/12 bg-linen/60 p-6 text-center">
        <p className="font-utility text-sm uppercase tracking-wider text-ink/60">
          Days Until Wedding
        </p>
        <p className="font-display text-5xl text-walnut">
          {rsvp.days_until_wedding}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl">Guests</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile label="Total Invited" value={rsvp.total_invited} />
          <StatTile
            label="Attending"
            value={rsvp.total_attending}
            accent="good"
          />
          <StatTile label="Declined" value={rsvp.total_declined} />
          <StatTile label="Waiting" value={rsvp.total_waiting} />
          <StatTile label="No Response" value={rsvp.total_no_response} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl">Households</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatTile label="Total" value={rsvp.households_total} />
          <StatTile
            label="Responded"
            value={rsvp.households_responded}
            accent="good"
          />
          <StatTile label="Pending" value={rsvp.households_pending} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl">Email Delivery</h2>
        <DeliveryStatsGrid delivery={delivery} />
      </div>
    </div>
  );
}

export default DashboardSection;
