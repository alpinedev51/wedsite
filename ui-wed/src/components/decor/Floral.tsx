import { MaskedSvg } from "./MaskedSvg";
import arrangement10 from "@/assets/decor/flowers/arrangement-10.svg";
import divider05 from "@/assets/decor/flowers/divider-05.svg";
import divider10 from "@/assets/decor/flowers/divider-10.svg";
import element08 from "@/assets/decor/flowers/element-08.svg";
import element11 from "@/assets/decor/flowers/element-11.svg";
import element16 from "@/assets/decor/flowers/element-16.svg";
import element21 from "@/assets/decor/flowers/element-21.svg";
import element25 from "@/assets/decor/flowers/element-25.svg";
import element33 from "@/assets/decor/flowers/element-33.svg";
import element35 from "@/assets/decor/flowers/element-35.svg";
import element43 from "@/assets/decor/flowers/element-43.svg";
import element51 from "@/assets/decor/flowers/element-51.svg";
import element75 from "@/assets/decor/flowers/element-75.svg";
import sideDesign01 from "@/assets/decor/flowers/side-design-01.svg";
import sideDesign04 from "@/assets/decor/flowers/side-design-04.svg";

// The floral line art in src/assets/decor/flowers/. `ratio` is each file's
// viewBox width / height, so a Floral only needs a width (or a height).
// To add one: drop the SVG in that folder, import it above and list it here.
const florals = {
  // A spray of flowers: blooms at the lower left, stems reaching up-right.
  "arrangement-10": { src: arrangement10, ratio: 707.07 / 424.31 },
  // A horizontal garland for between sections or under headings.
  "divider-05": { src: divider05, ratio: 661.27 / 127.69 },
  // A plain leafy vine; stays crisp small (used under the active nav link).
  "divider-10": { src: divider10, ratio: 505.56 / 90.66 },
  // Single flowers and sprigs.
  "element-08": { src: element08, ratio: 350.45 / 337.14 },
  "element-11": { src: element11, ratio: 396.62 / 344.02 },
  "element-16": { src: element16, ratio: 324.73 / 327.7 },
  "element-21": { src: element21, ratio: 426.24 / 421.34 },
  "element-25": { src: element25, ratio: 294.04 / 328.41 },
  "element-33": { src: element33, ratio: 225.52 / 576.77 },
  "element-35": { src: element35, ratio: 223.25 / 574.43 },
  "element-43": { src: element43, ratio: 399.5 / 736.7 },
  "element-51": { src: element51, ratio: 290.74 / 634.86 },
  "element-75": { src: element75, ratio: 192.64 / 581.86 },
  // Drawn as a bottom-left corner; flip it for the other corners.
  "side-design-01": { src: sideDesign01, ratio: 1006.36 / 840.74 },
  // Drawn for the right edge of a page (flat side on the right); flipX for
  // the left edge.
  "side-design-04": { src: sideDesign04, ratio: 380.46 / 1135.13 },
} as const;

export type FloralName = keyof typeof florals;

interface FloralProps {
  name: FloralName;
  /** Size, position and colour, e.g. "absolute top-0 left-0 w-48 text-sage2/60". */
  className?: string;
  /** Mirror left-to-right. */
  flipX?: boolean;
  /** Mirror top-to-bottom. */
  flipY?: boolean;
}

/** One piece of floral line art, drawn in the current text colour. */
export function Floral({ name, className = "", flipX, flipY }: FloralProps) {
  const { src, ratio } = florals[name];
  const flips = `${flipX ? "-scale-x-100" : ""} ${flipY ? "-scale-y-100" : ""}`;
  return (
    <MaskedSvg
      src={src}
      className={`${flips} ${className}`}
      style={{ aspectRatio: ratio }}
    />
  );
}
