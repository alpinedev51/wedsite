import { Floral } from "./Floral";

const corner = "absolute top-0 z-40 w-24 text-sage2/55 sm:w-40 lg:w-56 xl:w-64";

/** Floral sprays in the two top corners of the page. Layout places these
 * against its own top edge, so they sit around the name banner and scroll
 * away with the page. The sticky Nav (z-50) slides over them and never
 * carries any decor itself. */
export function PageCorners() {
  return (
    <>
      <Floral name="side-design-01" flipY className={`left-0 ${corner}`} />
      <Floral
        name="side-design-01"
        flipX
        flipY
        className={`right-0 ${corner}`}
      />
    </>
  );
}
