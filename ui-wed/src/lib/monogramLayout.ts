/** Positions for the Monogram's two initials and "&", worked out from the
 * letters' actual ink rather than their font boxes.
 *
 * Script capitals (Pinyon Script) have long swashes that reach far outside
 * the box the font reserves for them, so centering each letter with
 * text-anchor="middle" leaves the pair visibly off-center and lets swashes
 * run into the rings. Instead each glyph is measured with a canvas, the
 * three are arranged on a diagonal (first initial high, second low, the
 * classic stacked monogram), and the whole group is scaled to fit and
 * centered on its ink. Works for any pair of initials. */

export const MONOGRAM_CENTER = 80; // the SVG's viewBox is 0 0 160 160

const LETTER_FONT = {
  family: "Pinyon Script",
  size: 56,
  style: "",
  weight: 400,
};
const AMP_FONT = { family: "Fraunces", size: 18, style: "italic", weight: 300 };

// Tuned by eye for A&K. GAP is negative so the slanted letters tuck into
// each other; STAGGER lifts the first initial and drops the second. MAX_*
// keep the group inside the inner ring (r = 62). Checked by rendering all
// 676 pairs of capitals: every pair is centered and inside the ring, but in
// about half of them (e.g. J&C) a long stroke touches the "&". A&K is clear.
const GAP = -12;
const STAGGER = 10;
const AMP_LIFT = 2; // "&" sits this far below the letters' mid-line
const MAX_WIDTH = 104;
const MAX_HEIGHT = 64;

export interface GlyphPlacement {
  text: string;
  x: number; // text-anchor="start" origin, in unscaled units
  y: number; // baseline, in unscaled units
}

export interface MonogramLayout {
  first: GlyphPlacement;
  amp: GlyphPlacement;
  second: GlyphPlacement;
  // transform for the <g> holding the three glyphs
  translateX: number;
  translateY: number;
  scale: number;
}

export const monogramFonts = {
  letter: LETTER_FONT,
  amp: AMP_FONT,
};

interface Ink {
  left: number; // how far ink reaches left of the origin
  right: number; // how far ink reaches right of the origin
  ascent: number;
  descent: number;
}

function cssFont(font: typeof LETTER_FONT): string {
  return `${font.style} ${font.weight} ${font.size}px "${font.family}"`.trim();
}

function measure(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: typeof LETTER_FONT,
): Ink {
  if (!text) return { left: 0, right: 0, ascent: 0, descent: 0 };
  ctx.font = cssFont(font);
  const m = ctx.measureText(text);
  return {
    left: m.actualBoundingBoxLeft,
    right: m.actualBoundingBoxRight,
    ascent: m.actualBoundingBoxAscent,
    descent: m.actualBoundingBoxDescent,
  };
}

/** Lay out the initials from measured ink. Returns null where there's no
 * canvas to measure with (e.g. a non-browser environment); the component
 * then uses its fallback positions. */
export function measureMonogram(
  first: string,
  second: string,
): MonogramLayout | null {
  const ctx =
    typeof document === "undefined"
      ? null
      : document.createElement("canvas").getContext("2d");
  if (!ctx) return null;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const inkFirst = measure(ctx, first, LETTER_FONT);
  const inkAmp = measure(ctx, "&", AMP_FONT);
  const inkSecond = measure(ctx, second, LETTER_FONT);
  const width = (ink: Ink) => ink.left + ink.right;

  // Place each glyph's ink left to right, origins derived from the ink.
  const firstLeft = 0;
  const ampLeft = width(inkFirst) + GAP;
  const secondLeft = ampLeft + width(inkAmp) + GAP;

  const firstY = -STAGGER;
  const secondY = STAGGER;
  // "&" vertically centered between the two letters' ink, then nudged down.
  const firstMid = firstY + (inkFirst.descent - inkFirst.ascent) / 2;
  const secondMid = secondY + (inkSecond.descent - inkSecond.ascent) / 2;
  const ampY =
    (firstMid + secondMid) / 2 -
    (inkAmp.descent - inkAmp.ascent) / 2 +
    AMP_LIFT;

  const glyphs = [
    { text: first, ink: inkFirst, left: firstLeft, y: firstY },
    { text: "&", ink: inkAmp, left: ampLeft, y: ampY },
    { text: second, ink: inkSecond, left: secondLeft, y: secondY },
  ];

  // Bounding box of all the ink, then fit and center it.
  const drawn = glyphs.filter((g) => g.text);
  const minX = Math.min(...drawn.map((g) => g.left));
  const maxX = Math.max(...drawn.map((g) => g.left + width(g.ink)));
  const minY = Math.min(...drawn.map((g) => g.y - g.ink.ascent));
  const maxY = Math.max(...drawn.map((g) => g.y + g.ink.descent));
  const scale = Math.min(
    1,
    MAX_WIDTH / Math.max(maxX - minX, 1),
    MAX_HEIGHT / Math.max(maxY - minY, 1),
  );

  const place = (g: (typeof glyphs)[number]): GlyphPlacement => ({
    text: g.text,
    x: g.left + g.ink.left,
    y: g.y,
  });
  return {
    first: place(glyphs[0]),
    amp: place(glyphs[1]),
    second: place(glyphs[2]),
    translateX: MONOGRAM_CENTER - ((minX + maxX) / 2) * scale,
    translateY: MONOGRAM_CENTER - ((minY + maxY) / 2) * scale,
    scale,
  };
}
