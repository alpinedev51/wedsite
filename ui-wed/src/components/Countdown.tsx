import { useEffect, useState } from "react";

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeRemaining(target: Date): TimeRemaining {
  const diff = Math.max(0, target.getTime() - Date.now());

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

const units: { key: keyof TimeRemaining; label: string }[] = [
  { key: "days", label: "Days" },
  { key: "hours", label: "Hours" },
  { key: "minutes", label: "Minutes" },
  { key: "seconds", label: "Seconds" },
];

function Countdown({ target }: { target: Date }) {
  const [remaining, setRemaining] = useState(() => getTimeRemaining(target));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(getTimeRemaining(target));
    }, 1000);

    return () => clearInterval(interval);
  }, [target]);

  return (
    <div className="flex gap-6 sm:gap-10" role="timer" aria-live="polite">
      {units.map(({ key, label }) => (
        <div key={key} className="flex flex-col items-center">
          <span className="font-heading text-4xl text-walnut sm:text-5xl">
            {String(remaining[key]).padStart(2, "0")}
          </span>
          <span className="mt-1 font-body text-xs uppercase tracking-widest text-slate">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default Countdown;
