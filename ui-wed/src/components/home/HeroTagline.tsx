import { useEffect, useRef, useState } from "react";
import { m, useInView, useReducedMotion, type Variants } from "motion/react";

const TEXT = "We're getting married";

/** Head start (ms) the hero photo gets once it arrives, so the letters --
 * cream, like the page behind the photo -- don't appear before the photo
 * has faded in behind them. */
const PHOTO_HEAD_START_MS = 300;

// The line fades in as a soft sweep from left to right, each letter
// sharpening out of a light blur. Each letter's fade is long and they start
// close together, so many are part-way in at once -- a gradient moving
// across the line, rather than letters popping in one by one like typing.
// A soft ease (not a sharp ease-out) keeps each letter from jumping visible
// the moment it starts.
//
// It waits until the line is on screen: on a laptop it starts just below
// the fold, so playing it on load would happen where nobody sees it.

// CSS's standard "ease": still soft at the start, but under way sooner
// than an ease-in-out, so the sweep starts as soon as the line appears.
const fade = { duration: 1, ease: [0.25, 0.1, 0.25, 1] } as const;
const line: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.03 } },
};
const letter: Variants = {
  hidden: { opacity: 0, filter: "blur(4px)" },
  shown: {
    opacity: 1,
    filter: "blur(0px)",
    transition: fade,
    // Drop the filter once the letter is sharp: even blur(0px) keeps each
    // letter on its own layer, redrawn separately for good.
    transitionEnd: { filter: "none" },
  },
};
// Blur isn't movement, so the site-wide reduced-motion setting doesn't
// cover it: those guests get the same sweep without the blur.
const letterNoBlur: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: fade },
};

// Full-opacity linen, not linen/80: at 80% the photograph showed through the
// glyph strokes themselves, which costs legibility over a busy image for no
// visual gain -- the shadow is what gives this text its separation: a tight
// one crisps the letter edges, and two wider warm-dark glows lift the words off
// the photo.
function HeroTagline({
  play = true,
  className = "",
}: {
  /** Hold the sweep until this is true, e.g. until the hero photo has
   * loaded, so it never plays while the line can't be seen. */
  play?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLParagraphElement>(null);
  // Not the site's usual revealViewport: that ignores the bottom 10% of the
  // screen, which is exactly where this line sits on a phone, so it would
  // never start. Instead it plays as soon as a quarter of it is visible, so
  // it's already under way as the guest scrolls to it.
  const inView = useInView(ref, { once: true, amount: 0.25 });

  // `play` arms the sweep a moment after it turns true. The wait counts
  // from when the photo arrives, not from when the line scrolls into view,
  // so scrolling down to it later still starts it straight away.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!play) return;
    const timer = setTimeout(() => setArmed(true), PHOTO_HEAD_START_MS);
    return () => clearTimeout(timer);
  }, [play]);

  return (
    <m.p
      ref={ref}
      initial="hidden"
      animate={armed && inView ? "shown" : "hidden"}
      variants={line}
      className={`font-utility text-2xl uppercase tracking-label text-linen [text-shadow:0_1px_2px_rgb(30_20_10/0.55),0_2px_20px_rgb(30_20_10/0.7),0_0_56px_rgb(30_20_10/0.45)] sm:text-3xl lg:text-4xl ${className}`}
    >
      {/* Screen readers get the sentence once, as plain text; the letters
          below are hidden from them so it isn't spelled out. (An aria-label
          on the <p> isn't enough: many screen readers ignore labels on
          paragraphs, and would read nothing.) */}
      <span className="sr-only">{TEXT}</span>
      {/* Each word stays in one piece (nowrap) so a narrow screen breaks
          the line between words, never inside one. */}
      {TEXT.split(" ").map((word, w) => (
        // select-none: copying the line then picks up only the hidden
        // sentence above, not the sentence twice.
        <span key={w} aria-hidden="true" className="select-none">
          {w > 0 && " "}
          <span className="inline-block whitespace-nowrap">
            {[...word].map((char, c) => (
              <m.span
                key={c}
                variants={reduce ? letterNoBlur : letter}
                className="inline-block"
              >
                {char}
              </m.span>
            ))}
          </span>
        </span>
      ))}
    </m.p>
  );
}

export default HeroTagline;
