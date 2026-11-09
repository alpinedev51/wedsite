import { Fragment, useState } from "react";
import Lightbox from "./Lightbox";
import SmartImage from "./SmartImage";
import { Reveal } from "../motion/Reveal";
import { STAGGER } from "@/lib/motion";
import { coverSizes } from "@/lib/photoLibrary";
import { useGridColumns } from "@/hooks/useMediaQuery";

export interface GalleryImage {
  /** Works in every browser. For photos with `avifSrcSet` this is the
   *  WebP fallback for the few browsers without AVIF. */
  src: string;
  alt?: string;
  /** "url 640w, url 1600w, ..." -- several sizes of the same photo. The
   *  browser downloads only the one that fits the space it's shown in. */
  avifSrcSet?: string;
  /** Pixel size of the original. Only the shape is used, to work out how
   *  wide the photo is drawn (and so which srcset size to fetch). */
  width?: number;
  height?: number;
  /** Base64 ThumbHash: a blurred preview shown while the photo loads. */
  thumbhash?: string;
}

/** How wide a photo is drawn in a square cell of the grid below: 2 columns
 *  on phones, 3 from `sm`, inside a max-w-5xl Container; a pair is two
 *  columns in max-w-2xl. */
function gridSizes(image: GalleryImage, isPair: boolean) {
  return coverSizes(
    image,
    1,
    isPair
      ? [{ minWidth: 736, px: 328 }, { vw: 50 }]
      : [{ minWidth: 1024, px: 310 }, { minWidth: 640, vw: 33 }, { vw: 50 }],
  );
}

function Gallery({
  images,
  reveal = false,
  eagerFirstRow = false,
  className = "",
}: {
  images: GalleryImage[];
  /** Fade each photo's cell in as it scrolls into view. Off inside the
   * Things to Do pop-up, where the gallery is already on screen. */
  reveal?: boolean;
  /** Load the first row straight away rather than lazily: for a gallery
   * that's on screen when the page opens. */
  eagerFirstRow?: boolean;
  className?: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // A single photo in a three-column square grid reads as a mistake, so one
  // image gets one generous landscape cell instead of a lonely thumbnail.
  const isSingle = images.length === 1;
  // Two photos in a three-column grid leave an empty cell, so a pair gets
  // its own centred two-column row.
  const isPair = images.length === 2;
  // Columns as drawn right now (matching the grid classes below), so the
  // first row and the left-to-right ripple follow the real layout.
  const gridColumns = useGridColumns({ base: 2, sm: 3 });
  const columns = isSingle ? 1 : isPair ? 2 : gridColumns;

  return (
    <>
      <div
        className={
          isSingle
            ? `mx-auto max-w-2xl ${className}`
            : isPair
              ? `mx-auto grid max-w-2xl grid-cols-2 gap-3 sm:gap-4 ${className}`
              : `grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 ${className}`
        }
      >
        {images.map((image, i) => {
          const cell = (
            <button
              type="button"
              onClick={() => setActiveIndex(i)}
              className={`group relative w-full overflow-hidden rounded-xl bg-clay/10 ${
                isSingle ? "aspect-4/3" : "aspect-square"
              }`}
            >
              <SmartImage
                src={image.src}
                alt={image.alt ?? ""}
                avifSrcSet={image.avifSrcSet}
                sizes={
                  isSingle
                    ? // One generous 4:3 cell, max-w-2xl.
                      coverSizes(image, 4 / 3, [
                        { minWidth: 672, px: 672 },
                        { vw: 100 },
                      ])
                    : gridSizes(image, isPair)
                }
                thumbhash={image.thumbhash}
                loading={eagerFirstRow && i < columns ? "eager" : "lazy"}
                className="transition-transform duration-300 group-hover:scale-105"
              />
            </button>
          );
          // Staggered by column, so each row ripples in left to right.
          // The key goes on whatever map() returns. Index is part of it
          // because the same src can legitimately appear twice in one
          // gallery, and React needs unique keys.
          const key = `${image.src}-${i}`;
          return reveal ? (
            <Reveal key={key} delay={(i % columns) * STAGGER} y={16}>
              {cell}
            </Reveal>
          ) : (
            <Fragment key={key}>{cell}</Fragment>
          );
        })}
      </div>

      {activeIndex !== null && (
        <Lightbox
          images={images}
          index={activeIndex}
          onClose={() => setActiveIndex(null)}
          onIndexChange={setActiveIndex}
        />
      )}
    </>
  );
}

export default Gallery;
