import { useCountdown, type TimeRemaining } from "../hooks/useCountdown";

const units: { key: keyof TimeRemaining; label: string }[] = [
  { key: "days", label: "Days" },
  { key: "hours", label: "Hours" },
  { key: "minutes", label: "Minutes" },
  { key: "seconds", label: "Seconds" },
];

const sizeClasses = {
  sm: {
    value: "text-2xl sm:text-3xl",
    label: "text-[10px]",
    gap: "gap-4 sm:gap-6",
  },
  lg: {
    value: "text-4xl sm:text-5xl",
    label: "text-xs",
    gap: "gap-6 sm:gap-10",
  },
} as const;

function Countdown({
  target,
  size = "lg",
}: {
  target: Date;
  size?: keyof typeof sizeClasses;
}) {
  const remaining = useCountdown(target);
  const classes = sizeClasses[size];

  return (
    <div className={`flex ${classes.gap}`} role="timer" aria-live="polite">
      {units.map(({ key, label }) => (
        <div key={key} className="flex flex-col items-center">
          <span className={`font-display ${classes.value} text-walnut`}>
            {String(remaining[key]).padStart(2, "0")}
          </span>
          <span
            className={`mt-1 font-utility uppercase tracking-widest text-walnut/70 ${classes.label}`}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default Countdown;
