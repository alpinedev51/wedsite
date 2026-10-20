import { useState } from "react";
import Lightbox from "./Lightbox";

export interface GalleryImage {
  src: string;
  alt?: string;
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

  return (
    <>
      <div
        className={
          isSingle
            ? `mx-auto max-w-2xl ${className}`
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
            <img
              src={image.src}
              alt={image.alt ?? ""}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
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
