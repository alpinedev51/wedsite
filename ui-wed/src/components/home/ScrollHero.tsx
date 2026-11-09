import {
  useRef,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { m, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useImageReady } from "@/hooks/useImageReady";
import { PHOTO_MAX_WAIT_MS } from "@/lib/motion";
import ThumbhashBackdrop from "@/components/ui/ThumbhashBackdrop";

type HeroEffect = "intro" | "parallax" | "none";

// Moves the photo a little slower than the page the whole time the hero is
// on screen. Its own component so the scroll tracking only exists on heroes
// that use it. The photo is drawn a bit larger than its box so the drift
// never shows an edge (6% each way inside 7.5% of spare room).
function ParallaxLayer({
  target,
  children,
}: {
  target: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  // 0 as the hero enters from the bottom of the screen, 1 as it leaves.
  const { scrollYProgress } = useScroll({
    target,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);
  // Scroll-linked values bypass MotionConfig's reduced-motion setting, so
  // the drift is dropped by hand.
  return (
    <m.div
      className="relative h-full w-full scale-115"
      style={{ y: reduce ? 0 : y }}
    >
      {children}
    </m.div>
  );
}

// A full-bleed hero photo with a soft fade at its top/bottom edges into the
// page background, and an optional motion effect:
//  - "intro": for the photo at the top of the page. A short, plain fade-in
//    once the image has loaded, then the overlay text fades in. No zoom or
//    movement -- kept deliberately quiet.
//  - "parallax": for a photo further down. It moves a little slower than
//    the page the whole time it's on screen, which reads as depth.
function ScrollHero({
  src,
  alt,
  overlay,
  overlayAlign = "center",
  overlayTopPct,
  priority = false,
  heightClass = "h-dvh",
  maskFadeTopPct = 12,
  maskFadeBottomPct = 12,
  effect = "none",
  thumbhash,
  className = "",
}: {
  src: string;
  alt: string;
  /** Text over the photo. Pass a function to get the intro hero's `ready`
   * (true once the photo has arrived) and run your own entrance from it --
   * the hero then skips its usual fade for the overlay. Only the "intro"
   * hero tracks its photo: any other hero passes `true` straight away. */
  overlay?: ReactNode | ((ready: boolean) => ReactNode);
  overlayAlign?: "center" | "bottom";
  /** Where the overlay's middle sits, as a % of the hero's height from the
   * top (75 = three-quarters down). Overrides overlayAlign when set. */
  overlayTopPct?: number;
  priority?: boolean;
  heightClass?: string;
  maskFadeTopPct?: number;
  maskFadeBottomPct?: number;
  effect?: HeroEffect;
  /** Base64 ThumbHash of the photo, shown blurred until the photo loads. */
  thumbhash?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const intro = effect === "intro";

  // The intro fade waits for the photo itself, so a slow connection gets
  // the fade too rather than a photo that pops in after the fade has run. If
  // it's still loading after PHOTO_MAX_WAIT_MS, the photo and tagline fade
  // in anyway and the photo fills in as it arrives.
  //
  // Unlike SmartImage, this fades in on every visit, even when the browser
  // already has the photo cached: the fade is part of how the home page
  // opens, so `cached` is deliberately ignored here.
  const { ready, imgProps } = useImageReady({
    src,
    maxWaitMs: PHOTO_MAX_WAIT_MS,
    active: intro,
  });

  const fadeVar = {
    "--fade-top-pct": `${maskFadeTopPct}%`,
    "--fade-bottom-pct": `${maskFadeBottomPct}%`,
  } as CSSProperties;

  // The blurred preview sits under the photo, so until the photo arrives the
  // hero shows a soft version of it instead of an empty space.
  const preview = thumbhash && <ThumbhashBackdrop hash={thumbhash} />;

  const img = (
    <m.img
      src={src}
      alt={alt}
      // relative: draws above the absolutely positioned preview.
      className="relative h-full w-full object-cover"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      {...(intro ? imgProps : {})}
      initial={intro ? { opacity: 0 } : false}
      animate={intro ? { opacity: ready ? 1 : 0 } : undefined}
      transition={{ duration: 0.8, ease: "easeOut" }}
    />
  );

  // In the parallax layer the preview moves with the photo.
  const image =
    effect === "parallax" ? (
      <ParallaxLayer target={ref}>
        {preview}
        {img}
      </ParallaxLayer>
    ) : (
      <>
        {preview}
        {img}
      </>
    );

  // The overlay text fades in just after the photo, on the intro hero only
  // -- unless it brings its own entrance (a function overlay).
  const overlayContent =
    typeof overlay === "function" ? (
      overlay(intro ? ready : true)
    ) : intro ? (
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: ready ? 1 : 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
      >
        {overlay}
      </m.div>
    ) : (
      overlay
    );

  const overlayLayer =
    overlay && overlayTopPct !== undefined ? (
      // Centered on a point `overlayTopPct`% down the photo, so the text can
      // sit on a particular part of the image (e.g. the grass at the bottom).
      <div
        className="absolute inset-x-0 flex -translate-y-1/2 justify-center px-6 text-center"
        style={{ top: `${overlayTopPct}%` }}
      >
        {overlayContent}
      </div>
    ) : (
      overlay && (
        <div
          className={`absolute inset-0 flex justify-center p-6 ${
            overlayAlign === "bottom"
              ? "items-end pb-14 sm:pb-20"
              : "items-center"
          }`}
        >
          {overlayContent}
        </div>
      )
    );

  return (
    <div
      ref={ref}
      className={`hero-fade-mask relative ${heightClass} w-full overflow-hidden ${className}`}
      style={fadeVar}
    >
      {image}
      {overlayLayer}
    </div>
  );
}

export default ScrollHero;
