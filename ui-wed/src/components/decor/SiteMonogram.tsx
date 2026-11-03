import { MaskedSvg } from "./MaskedSvg";
import { Monogram } from "./Monogram";

// Your own monogram artwork, if you've added one at
// src/assets/decor/monogram.svg. Vite checks for the file at build time; when
// it isn't there this is undefined and the generated Monogram is used instead.
const customSvgUrl = Object.values(
  import.meta.glob<string>("../../assets/decor/monogram.svg", {
    eager: true,
    query: "?url",
    import: "default",
  }),
)[0];

interface SiteMonogramProps {
  className?: string;
  /** Paint the artwork in the current text colour (e.g. `text-walnut/70`),
   * like the generated Monogram, whatever colours the file uses. Set false
   * to show a multi-colour SVG as-is. */
  recolor?: boolean;
}

/** The couple's monogram: the SVG at src/assets/decor/monogram.svg if there
 * is one, otherwise the generated Monogram built from the couple's initials. */
export function SiteMonogram({
  className = "",
  recolor = true,
}: SiteMonogramProps) {
  if (!customSvgUrl) return <Monogram className={className} />;

  if (!recolor) {
    return (
      <img
        src={customSvgUrl}
        alt=""
        aria-hidden="true"
        className={`object-contain ${className}`}
      />
    );
  }

  return <MaskedSvg src={customSvgUrl} className={className} />;
}
