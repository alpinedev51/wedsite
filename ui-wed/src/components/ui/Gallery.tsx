import { useState } from "react";
import Lightbox from "./Lightbox";

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
}

/** How wide a photo is drawn in a square cell of the grid below (cols:
 *  2 on phones, 3 from `sm`, inside a max-w-5xl Container; a pair is two
 *  columns in max-w-2xl). object-cover fills the square with the photo's
 *  short edge, so a landscape photo is drawn `aspect` times wider than the
 *  cell. */
function gridSizes({ width, height }: GalleryImage, isPair: boolean) {
  const k = width && height ? Math.max(1, width / height) : 1;
  const px = (n: number) => `${Math.round(n * k)}px`;
  const vw = (n: number) => `${Math.round(n * k)}vw`;
  return (
    isPair
      ? [`(min-width: 736px) ${px(328)}`, vw(50)]
      : [
          `(min-width: 1024px) ${px(310)}`,
          `(min-width: 640px) ${vw(33)}`,
          vw(50),
        ]
  ).join(", ");
}

function Gallery({
  images,
  className = "",
}: {
  images: GalleryImage[];
  className?: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // A single photo in a three-column square grid reads as a mistake, so one
  // image gets one generous landscape cell instead of a lonely thumbnail.
  const isSingle = images.length === 1;
  // Two photos in a three-column grid leave an empty cell, so a pair gets
  // its own centred two-column row.
  const isPair = images.length === 2;

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
        {images.map((image, i) => (
          <button
            // Index is part of the key because the same src can legitimately
            // appear twice in one gallery, and React needs unique keys.
            key={`${image.src}-${i}`}
            type="button"
            onClick={() => setActiveIndex(i)}
            className={`group overflow-hidden rounded-xl bg-clay/10 ${
              isSingle ? "aspect-4/3 w-full" : "aspect-square"
            }`}
          >
            <picture className="contents">
              {image.avifSrcSet && (
                <source
                  type="image/avif"
                  srcSet={image.avifSrcSet}
                  sizes={
                    isSingle
                      ? "(min-width: 672px) 672px, 100vw"
                      : gridSizes(image, isPair)
                  }
                />
              )}
              <img
                src={image.src}
                alt={image.alt ?? ""}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </picture>
          </button>
        ))}
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
