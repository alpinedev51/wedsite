import { m, type Variants } from "motion/react";
import type { Coordinates } from "../../config/wedding";
import { REVEAL_Y, revealSpring, revealViewport } from "@/lib/motion";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  NATION_PATH,
  STATE_BORDERS_PATH,
  projectToMap,
} from "./usMapPaths";

const PIN_HEADROOM = 60;

// The entrance, in order: the map card rises in, a warm glow blooms on the
// venue, the pin drops onto it, then the label fades in beside it. The card
// carries "hidden"/"shown" down to each piece, so one trigger plays the
// whole sequence.
const card: Variants = {
  hidden: { opacity: 0, y: REVEAL_Y },
  shown: { opacity: 1, y: 0, transition: revealSpring },
};
const glowIn: Variants = {
  hidden: { opacity: 0, scale: 0.5 },
  shown: {
    opacity: 1,
    scale: 1,
    transition: { duration: 1, ease: "easeOut", delay: 0.45 },
  },
};
const pinDrop: Variants = {
  hidden: { opacity: 0, y: -36 },
  shown: {
    opacity: 1,
    y: 0,
    // A touch of bounce as it lands -- the one place on the site that has
    // any, kept small.
    transition: {
      y: { type: "spring", bounce: 0.3, duration: 0.7, delay: 0.6 },
      opacity: { duration: 0.2, delay: 0.6 },
    },
  },
};
// The pin's shadow and pulsing ring, which stay on the ground as it lands.
const groundIn: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.4, delay: 0.85 } },
};
const labelIn: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.6, delay: 1.1 } },
};

// A hand-styled map of the lower 48 with a pin on the venue.
function UsMap({
  label,
  coordinates,
  className = "",
}: {
  /** Text beside the pin, e.g. "Durango, CO". */
  label: string;
  coordinates: Coordinates;
  className?: string;
}) {
  const { x, y } = projectToMap(coordinates.latitude, coordinates.longitude);
  // A place off the lower-48 map (Alaska, Hawaii, abroad) gets no pin rather
  // than one floating in the margin.
  const onMap = x >= 0 && x <= MAP_WIDTH && y >= 0 && y <= MAP_HEIGHT;
  // The label sits to the right of the pin, or to the left when the pin is
  // in the eastern half (so it doesn't run off the edge). It's raised on a
  // leader line unless the pin is near the top, where there's no room.
  const side = x > MAP_WIDTH * 0.55 ? -1 : 1;
  const raised = y > 130;
  const labelX = x + side * (raised ? 72 : 36);
  const labelY = raised ? y - 76 : y - 36;

  return (
    <m.figure
      initial="hidden"
      whileInView="shown"
      viewport={revealViewport}
      variants={card}
      className={`w-full rounded-3xl border border-walnut/15 bg-linen p-4 shadow-sm sm:p-6 ${className}`}
    >
      <svg
        // Headroom above the map so a pin near the northern border fits.
        viewBox={`0 ${-PIN_HEADROOM} ${MAP_WIDTH} ${MAP_HEIGHT + PIN_HEADROOM}`}
        className="h-auto w-full"
        role="img"
        aria-label={
          onMap
            ? `Map of the United States with a pin on ${label}`
            : "Map of the United States"
        }
      >
        <defs>
          <pattern
            id="usmap-hatch"
            width="9"
            height="9"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(35)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="9"
              stroke="var(--color-sage)"
              strokeWidth="1"
              opacity="0.35"
            />
          </pattern>
          <radialGradient id="usmap-glow">
            <stop
              offset="0%"
              stopColor="var(--color-ochre)"
              stopOpacity="0.45"
            />
            <stop
              offset="100%"
              stopColor="var(--color-ochre)"
              stopOpacity="0"
            />
          </radialGradient>
        </defs>

        {/* Soft offset shadow, then the land: a sage wash with a fine hatch
            so it reads like an engraved print rather than a flat fill. */}
        <path
          d={NATION_PATH}
          transform="translate(4 6)"
          fill="var(--color-walnut)"
          opacity="0.08"
        />
        <path d={NATION_PATH} fill="var(--color-sage-wash)" />
        <path d={NATION_PATH} fill="url(#usmap-hatch)" />
        <path
          d={STATE_BORDERS_PATH}
          fill="none"
          stroke="var(--color-walnut)"
          strokeOpacity="0.22"
          strokeWidth="0.8"
          strokeDasharray="3 3"
          strokeLinejoin="round"
        />
        <path
          d={NATION_PATH}
          fill="none"
          stroke="var(--color-walnut)"
          strokeOpacity="0.6"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* The pin: a warm glow, a ring that gently pulses, and a teardrop
            marker whose point sits exactly on the venue. */}
        {onMap && (
          <>
            <m.circle
              variants={glowIn}
              cx={x}
              cy={y}
              r="70"
              fill="url(#usmap-glow)"
            />
            <m.g variants={groundIn}>
              <circle
                cx={x}
                cy={y}
                r="12"
                fill="none"
                stroke="var(--color-ochre-deep)"
                strokeWidth="1.5"
                className="usmap-pulse"
              />
              <ellipse
                cx={x}
                cy={y + 4}
                rx="11"
                ry="4"
                fill="var(--color-brown)"
                opacity="0.25"
              />
            </m.g>
            {/* The pin drops in an outer group; the inner one keeps the
                transform that places it, which an animated y would
                otherwise replace. */}
            <m.g variants={pinDrop}>
              <g transform={`translate(${x} ${y}) scale(1.6)`}>
                <path
                  d="M0 0 C -3 -9 -14 -18 -14 -30 A 14 14 0 1 1 14 -30 C 14 -18 3 -9 0 0 Z"
                  fill="var(--color-walnut2)"
                  stroke="var(--color-linen)"
                  strokeWidth="2"
                />
                <circle cx="0" cy="-30" r="5" fill="var(--color-linen)" />
              </g>
            </m.g>

            {/* Label: a thin leader line out to the side of the pin. */}
            <m.g variants={labelIn}>
              {raised && (
                <line
                  x1={x + side * 26}
                  y1={y - 52}
                  x2={x + side * 66}
                  y2={y - 80}
                  stroke="var(--color-walnut)"
                  strokeOpacity="0.5"
                  strokeWidth="1"
                />
              )}
              <text
                x={labelX}
                y={labelY}
                textAnchor={side === 1 ? "start" : "end"}
                fill="var(--color-walnut)"
                className="font-display"
                fontSize="36"
              >
                {label}
              </text>
            </m.g>
          </>
        )}
      </svg>
    </m.figure>
  );
}

export default UsMap;
