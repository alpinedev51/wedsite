import type { ReactNode } from "react";
import { m } from "motion/react";
import { REVEAL_Y, revealSpring, revealViewport } from "@/lib/motion";

/** Fades its children in and up the first time they scroll into view.
 *
 * For a row of items, give each its own Reveal with a growing `delay`
 * (i * STAGGER) rather than one Reveal around the row: on a phone the row is
 * a tall stack, and each item should wait until it's actually on screen.
 *
 * It finishes with no transform left on the element, so it's safe around
 * anything -- a leftover transform would trap position:fixed children (see
 * the note on .anim-panel in index.css). */
export function Reveal({
  children,
  delay = 0,
  y = REVEAL_Y,
  className,
}: {
  children: ReactNode;
  /** Seconds to wait once in view. */
  delay?: number;
  /** How far it rises, in px. */
  y?: number;
  className?: string;
}) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={revealViewport}
      transition={{ ...revealSpring, delay }}
    >
      {children}
    </m.div>
  );
}
