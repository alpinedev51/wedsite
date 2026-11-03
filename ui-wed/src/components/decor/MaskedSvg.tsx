import type { CSSProperties } from "react";

interface MaskedSvgProps {
  /** URL of the SVG (an `import x from "....svg"`). */
  src: string;
  className?: string;
  style?: CSSProperties;
}

/** Shows an SVG file's shape painted in the current text colour, so it can be
 * coloured with classes like `text-sage2/60` whatever colours the file uses.
 * The SVG is used as a mask over a block filled with that colour. Purely
 * decorative: hidden from screen readers and lets clicks pass through. */
export function MaskedSvg({ src, className = "", style }: MaskedSvgProps) {
  const mask = `url("${src}") center / contain no-repeat`;
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none block bg-current ${className}`}
      style={{ mask, WebkitMask: mask, ...style }}
    />
  );
}
