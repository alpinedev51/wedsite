import { useCountdown, type TimeRemaining } from "../hooks/useCountdown";

const units: { key: keyof TimeRemaining; label: string }[] = [
  { key: "days", label: "Days" },
  { key: "hours", label: "Hours" },
  { key: "minutes", label: "Minutes" },
  { key: "seconds", label: "Seconds" },
];

function Countdown({ target }: { target: Date }) {
  const remaining = useCountdown(target);

  return (
    <div className="flex gap-6 sm:gap-10" role="timer" aria-live="polite">
      {units.map(({ key, label }) => (
        <div key={key} className="flex flex-col items-center">
          <span className="font-display text-4xl text-walnut sm:text-5xl">
            {String(remaining[key]).padStart(2, "0")}
          </span>
          <span className="mt-1 font-utility text-xs uppercase tracking-widest text-slate">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default Countdown;
