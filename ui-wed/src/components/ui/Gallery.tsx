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

  return (
    <>
      <div
        className={`grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 ${className}`}
      >
        {images.map((image, i) => (
          <button
            key={image.src}
            type="button"
            onClick={() => setActiveIndex(i)}
            className="group aspect-square overflow-hidden rounded-xl bg-clay/10"
          >
            <img
              src={image.src}
              alt={image.alt ?? ""}
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
