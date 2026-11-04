import { useLayoutEffect, useState } from "react";
import { useWeddingConfig } from "../../config/useWeddingConfig";
import { initialsFrom } from "../../lib/names";
import {
  MONOGRAM_CENTER as C,
  measureMonogram,
  monogramFonts,
  type MonogramLayout,
} from "../../lib/monogramLayout";

interface MonogramProps {
  className?: string;
}

// Used only where the letters can't be measured (no canvas). These are the
// measured values for A & K, which suit most pairs of script capitals.
function fallbackLayout(first: string, second: string): MonogramLayout {
  return {
    first: { text: first, x: 0, y: -10 },
    amp: { text: "&", x: 46, y: -12 },
    second: { text: second, x: 47, y: 10 },
    translateX: 28,
    translateY: 97,
    scale: 0.87,
  };
}

/** A diamond stud centered on (x, y). */
function Stud({ x, y }: { x: number; y: number }) {
  const s = 2.4;
  return (
    <path
      d={`M${x} ${y - s} L${x + s} ${y} L${x} ${y + s} L${x - s} ${y} Z`}
      fill="currentColor"
      opacity="0.55"
    />
  );
}

// Initials come from the couple's names in wedding config, read here so every
// Monogram on the site shows the same pair in the same (groom & bride) order
// without each caller having to build it. Just the rings and "&" until real
// names are known, rather than showing the placeholder "M & M".
export function Monogram({ className }: MonogramProps) {
  const { wedding } = useWeddingConfig();
  const [first, second] = wedding.namesConfigured
    ? initialsFrom(wedding.groomFirstName, wedding.brideFirstName)
    : ["", ""];
  const [layout, setLayout] = useState<MonogramLayout | null>(null);

  // Measure before paint, and again whenever web fonts finish loading: until
  // Pinyon Script arrives, the browser measures (and draws) a fallback font.
  useLayoutEffect(() => {
    const update = () => setLayout(measureMonogram(first, second));
    update();
    const fonts = typeof document === "undefined" ? undefined : document.fonts;
    if (!fonts) return;
    let active = true;
    void fonts.ready.then(() => active && update());
    fonts.addEventListener("loadingdone", update);
    return () => {
      active = false;
      fonts.removeEventListener("loadingdone", update);
    };
  }, [first, second]);

  const l = layout ?? fallbackLayout(first, second);
  const { letter, amp } = monogramFonts;

  return (
    <svg viewBox="0 0 160 160" className={className} aria-hidden="true">
      <circle
        cx={C}
        cy={C}
        r="70"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle
        cx={C}
        cy={C}
        r="62"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.45"
      />
      <Stud x={C} y={10} />
      <Stud x={C} y={150} />
      <Stud x={10} y={C} />
      <Stud x={150} y={C} />

      <g
        transform={`translate(${l.translateX} ${l.translateY}) scale(${l.scale})`}
        fill="currentColor"
      >
        <text
          x={l.first.x}
          y={l.first.y}
          fontFamily={`'${letter.family}', cursive`}
          fontSize={letter.size}
        >
          {l.first.text}
        </text>
        <text
          x={l.amp.x}
          y={l.amp.y}
          fontFamily={`'${amp.family}', serif`}
          fontSize={amp.size}
          fontStyle={amp.style}
          fontWeight={amp.weight}
          opacity="0.7"
        >
          &amp;
        </text>
        <text
          x={l.second.x}
          y={l.second.y}
          fontFamily={`'${letter.family}', cursive`}
          fontSize={letter.size}
        >
          {l.second.text}
        </text>
      </g>
    </svg>
  );
}
