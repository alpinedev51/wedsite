import type { ReactNode } from "react";
import { useCountdown, type TimeRemaining } from "../hooks/useCountdown";
import { isSameVenueDay, isValidDate } from "../lib/date";

// Only the numeric fields -- `keyof TimeRemaining` would also admit the
// boolean `hasPassed`, which has no place in the digit row.
type CountdownUnit = Exclude<keyof TimeRemaining, "hasPassed">;

const units: { key: CountdownUnit; label: string }[] = [
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
    gap: "gap-5 sm:gap-10",
  },
} as const;

function Countdown({
  target,
  size = "lg",
  passedMessage = "Today's the day",
  afterMessage = "Thank you for celebrating with us",
  heading,
}: {
  target: Date;
  size?: keyof typeof sizeClasses;
  /** Shown above the digits, and only while they are (e.g. "Counting down"). */
  heading?: ReactNode;
  /** Shown on the wedding day itself, once the target time has passed. */
  passedMessage?: string;
  /** Shown from the following (venue-local) calendar day onward. */
  afterMessage?: string;
}) {
  const remaining = useCountdown(target);
  const classes = sizeClasses[size];

  // Nothing to count down to -- better blank than "NaN" in every slot.
  if (!isValidDate(target)) return null;

  // Otherwise this sits at four zeros forever after the wedding.
  if (remaining.hasPassed) {
    const stillWeddingDay = isSameVenueDay(target, new Date());
    return (
      <p className="font-script text-3xl text-walnut sm:text-4xl">
        {stillWeddingDay ? passedMessage : afterMessage}
      </p>
    );
  }

  return (
    <>
      {heading}
      <div
        className={`flex ${classes.gap}`}
        role="timer"
        // Deliberately not aria-live: the seconds field changes every second, so
        // a polite live region made screen readers announce the countdown
        // continuously and forever. The date is stated in text nearby.
        aria-label="Time until the wedding"
      >
        {units.map(({ key, label }) => (
          <div key={key} className="flex flex-col items-center">
            <span
              className={`font-display tabular-nums ${classes.value} text-walnut`}
            >
              {String(remaining[key]).padStart(2, "0")}
            </span>
            <span
              className={`mt-1 font-utility uppercase tracking-widest text-walnut ${classes.label}`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

export default Countdown;
