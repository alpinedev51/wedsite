import { useEffect, useState } from "react";

export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** True once the target has passed -- lets callers swap the ticker for a
   * past-tense message instead of showing four zeros forever. */
  hasPassed: boolean;
}

function getTimeRemaining(target: Date): TimeRemaining {
  const delta = target.getTime() - Date.now();
  const diff = Math.max(0, delta);

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    hasPassed: delta <= 0,
  };
}

export function useCountdown(target: Date): TimeRemaining {
  // The interval only drives re-renders; the value itself is derived during
  // render from `target`. That keeps the remaining time correct the instant
  // the live wedding config resolves and swaps `target` for a new Date --
  // holding it in state would have shown a stale value for up to a second --
  // and avoids calling setState from the effect body, which this codebase
  // deliberately never does (react-hooks/set-state-in-effect).
  const [, setTick] = useState(0);
  const remaining = getTimeRemaining(target);

  // Once the target has passed there are no seconds to show, only a message
  // that changes at venue midnight (see Countdown) -- so drop to one tick a
  // minute instead of re-rendering every second forever. An invalid target
  // (Countdown renders nothing for one) gets no timer at all.
  const tickMs = Number.isNaN(target.getTime())
    ? null
    : remaining.hasPassed
      ? 60_000
      : 1000;
  useEffect(() => {
    if (tickMs === null) return;
    const interval = setInterval(() => setTick((t) => t + 1), tickMs);
    return () => clearInterval(interval);
  }, [tickMs]);

  return remaining;
}
