import type { Transition } from "motion/react";

// One set of motion values for the whole site, so every entrance feels like
// the same hand made it. Change them here rather than per component.

/** The standard entrance: a smooth spring with no overshoot. */
export const revealSpring: Transition = {
  type: "spring",
  bounce: 0,
  duration: 0.9,
};

/** How far (px) things rise as they fade in. */
export const REVEAL_Y = 24;

/** Gap between items that appear one after another (seconds). */
export const STAGGER = 0.08;

/** A long, gentle ease-out for photo unveils and slow zooms. */
export const easeOutSoft = [0.22, 1, 0.36, 1] as const;

/** Start an entrance a little after its element crosses the bottom of the
 * screen, so it plays where the guest is looking rather than off the edge. */
export const revealViewport = {
  once: true,
  margin: "0px 0px -10% 0px",
} as const;

/** Longest a photo that fades in waits for its image before showing
 * anyway, so a slow or stalled download never leaves part of a page blank.
 * The photo then fills in as it arrives. */
export const PHOTO_MAX_WAIT_MS = 2500;
