import { type CSSProperties, type ReactNode } from "react";

// A full-bleed hero photo with a soft fade at its top/bottom edges into the
// page background. Plain in-flow content -- no sticky/pin/parallax effect.
function ScrollHero({
  src,
  alt,
  overlay,
  overlayAlign = "center",
  priority = false,
  heightClass = "h-dvh",
  maskFadeTopPct = 12,
  maskFadeBottomPct = 12,
  className = "",
}: {
  src: string;
  alt: string;
  overlay?: ReactNode;
  overlayAlign?: "center" | "bottom";
  priority?: boolean;
  heightClass?: string;
  maskFadeTopPct?: number;
  maskFadeBottomPct?: number;
  className?: string;
}) {
  const fadeVar = {
    "--fade-top-pct": `${maskFadeTopPct}%`,
    "--fade-bottom-pct": `${maskFadeBottomPct}%`,
  } as CSSProperties;

  const image = (
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-cover"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
    />
  );

  const overlayLayer = overlay && (
    <div
      className={`absolute inset-0 flex justify-center p-6 ${overlayAlign === "bottom" ? "items-end pb-14 sm:pb-20" : "items-center"
        }`}
    >
      {overlay}
    </div>
  );

  return (
    <div
      className={`hero-fade-mask relative ${heightClass} w-full overflow-hidden ${className}`}
      style={fadeVar}
    >
      {image}
      {overlayLayer}
    </div>
  );
}

export default ScrollHero;
