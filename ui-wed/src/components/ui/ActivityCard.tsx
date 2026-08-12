function ActivityCard({
  title,
  summary,
  onOpen,
  className = "",
}: {
  title: string;
  summary: string;
  onOpen: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex h-full flex-col gap-3 rounded-2xl border border-walnut/12 bg-linen/60 p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-walnut/25 hover:bg-linen hover:shadow-md ${className}`}
    >
      <h3 className="font-display text-lg text-walnut">{title}</h3>
      <p className="font-body text-sm text-ink/70">{summary}</p>
    </button>
  );
}

export default ActivityCard;
