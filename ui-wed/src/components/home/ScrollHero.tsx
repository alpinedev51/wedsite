import { type CSSProperties, type ReactNode } from "react";

// A full-bleed hero photo that pins in place (native CSS `sticky`, no JS)
// for an extra stretch of scroll before releasing to the next section --
// the page seems to "slow down" and hold on the image, then continues.
//
// This used to be a framer-motion parallax (the image translating at a
// different rate than the page) instead of a plain pin. That caused
// visible jank specifically on mobile: the parallax's transform was
// recomputed on every scroll frame from measurements of this component's
// own `h-dvh` height, but `dvh` itself changes mid-scroll on phones as the
// browser's address bar collapses/expands -- so the transform was
// constantly chasing a moving target, which read as the image "cutting out
// and jumping" bigger/smaller. Native `sticky` positioning runs no per-frame
// JS at all, so there's nothing left to glitch against that resize.
//
// No scale/zoom/parallax of any kind here on purpose -- the image itself
// never changes size or crop, only whether the page is currently scrolling
// past it or paused on it.
function ScrollHero({
  src,
  alt,
  overlay,
  overlayAlign = "center",
  priority = false,
  heightClass = "h-dvh",
  pinVh = 160,
  maskFadePct = 12,
  className = "",
}: {
  src: string;
  alt: string;
  overlay?: ReactNode;
  overlayAlign?: "center" | "bottom";
  priority?: boolean;
  heightClass?: string;
  pinVh?: number;
  maskFadePct?: number;
  className?: string;
}) {
  const fadeVar = { "--fade-pct": `${maskFadePct}%` } as CSSProperties;

  const image = (
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-cover"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
    />
  );

  // No dark scrim here -- `overlay` is expected to bring its own
  // legible-on-a-photo backing, so it doesn't fight with the fade-mask look
  // by darkening the whole image.
  const overlayLayer = overlay && (
    <div
      className={`absolute inset-0 flex justify-center p-6 ${
        overlayAlign === "bottom" ? "items-end pb-14 sm:pb-20" : "items-center"
      }`}
    >
      {overlay}
    </div>
  );

  return (
    <div className="relative" style={{ height: `${pinVh}vh` }}>
      <div
        className={`hero-fade-mask sticky top-0 ${heightClass} w-full overflow-hidden ${className}`}
        style={fadeVar}
      >
        {image}
        {overlayLayer}
      </div>
    </div>
  );
}

export default ScrollHero;
