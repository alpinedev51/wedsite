import { useRef, type ReactNode, type CSSProperties } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";

function ScrollHero({
  src,
  alt,
  overlay,
  overlayAlign = "center",
  priority = false,
  heightClass = "h-dvh",
  parallaxPx = 70,
  maskFadePct = 12,
  className = "",
}: {
  src: string;
  alt: string;
  overlay?: ReactNode;
  overlayAlign?: "center" | "bottom";
  priority?: boolean;
  heightClass?: string;
  parallaxPx?: number;
  maskFadePct?: number;
  className?: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [-parallaxPx, parallaxPx]);

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

  const overlayLayer = overlay && (
    <div
      className={`absolute inset-0 flex justify-center p-6 ${overlayAlign === "center" ? "items-end pb-14 sm:pb-20" : "items-center"
        }`}
    >
      {overlay}
    </div>
  );

  if (prefersReducedMotion) {
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

  return (
    <div
      ref={wrapperRef}
      className={`hero-fade-mask relative ${heightClass} w-full overflow-hidden ${className}`}
      style={fadeVar}
    >
      <motion.div
        className="absolute inset-x-0"
        style={{ top: -parallaxPx, bottom: -parallaxPx, y }}
      >
        {image}
      </motion.div>
      {overlayLayer}
    </div>
  );
}

export default ScrollHero;
