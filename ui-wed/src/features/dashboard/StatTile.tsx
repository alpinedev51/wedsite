type Accent = "good" | "critical" | "neutral";

// Shared by DashboardSection (RSVP/household/delivery tiles) and
// DeliveryStatsGrid (both the global and per-campaign delivery
// breakdowns) -- one small presentational component instead of repeating
// this markup over a dozen times across both.
//
// Color here follows the dataviz skill's "status" color job: a small,
// reserved, fixed-meaning scale (good/critical), never reused for plain
// series identity. Rather than inventing new colors, it reuses this app's
// already-established tokens for the same meanings elsewhere in the admin
// UI -- text-olive2 for success (e.g. the "Saved." confirmation in
// WeddingSettingsSection) and text-terracotta for error (used throughout
// for form/API error text).
function StatTile({
  label,
  value,
  accent = "neutral",
}: {
  label: string;
  value: number | string;
  accent?: Accent;
}) {
  const valueClass =
    accent === "good"
      ? "text-olive2"
      : accent === "critical"
        ? "text-terracotta"
        : "text-walnut";

  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-walnut/12 bg-linen/60 p-4">
      <span className="font-utility text-xs uppercase tracking-wider text-ink/70">
        {label}
      </span>
      <span className={`font-display text-2xl ${valueClass}`}>{value}</span>
    </div>
  );
}

export default StatTile;
