const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function MiniCalendar({
  year,
  month,
  highlightDay,
  className = "",
}: {
  year: number;
  month: number; // 0-11
  highlightDay?: number;
  className?: string;
}) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div
      className={`w-full max-w-xs rounded-3xl border border-walnut/15 bg-linen p-6 text-center shadow-sm ${className}`}
    >
      <p className="font-display text-xl text-walnut">{monthLabel}</p>

      <div className="mt-5 grid grid-cols-7 gap-y-2">
        {WEEKDAYS.map((day, i) => (
          <span
            key={i}
            className="font-utility text-[11px] uppercase tracking-widest text-walnut/50"
          >
            {day}
          </span>
        ))}

        {cells.map((day, i) => (
          <span key={i} className="flex items-center justify-center py-1">
            {day === null ? null : day === highlightDay ? (
              <span className="relative flex h-9 w-9 items-center justify-center">
                <svg
                  viewBox="0 0 40 40"
                  className="absolute inset-0 h-full w-full text-ochre"
                  aria-hidden="true"
                >
                  <ellipse
                    cx="20"
                    cy="20"
                    rx="17"
                    ry="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    transform="rotate(-16 20 20)"
                  />
                  <ellipse
                    cx="20"
                    cy="20"
                    rx="15"
                    ry="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    opacity="0.6"
                    transform="rotate(12 12 20)"
                  />
                </svg>
                <span className="relative font-display text-base font-semibold text-walnut">
                  {day}
                </span>
              </span>
            ) : (
              <span className="font-body text-sm text-ink/60">{day}</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

export default MiniCalendar;
