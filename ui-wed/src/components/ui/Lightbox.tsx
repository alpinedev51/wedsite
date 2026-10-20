import { useCallback, useEffect, useRef } from "react";
import type { GalleryImage } from "./Gallery";
import { useModalBehavior } from "../../hooks/useModalBehavior";

// Horizontal travel (px) before a touch counts as a swipe rather than a tap.
const SWIPE_THRESHOLD = 50;

function Lightbox({
  images,
  index,
  onClose,
  onIndexChange,
}: {
  images: GalleryImage[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  const panelRef = useModalBehavior<HTMLDivElement>(onClose);
  const touchStartX = useRef<number | null>(null);

  const goPrev = useCallback(
    () => onIndexChange((index - 1 + images.length) % images.length),
    [index, images.length, onIndexChange],
  );
  const goNext = useCallback(
    () => onIndexChange((index + 1) % images.length),
    [index, images.length, onIndexChange],
  );

  // Escape/Tab/scroll-lock come from useModalBehavior; arrow keys are this
  // component's own concern.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goPrev, goNext]);

  // Warm the neighbours so paging through a gallery doesn't flash a blank
  // frame while the next full-size image downloads. Keyed on the two URLs,
  // not the `images` array, so a parent that rebuilds its array each render
  // doesn't re-run this.
  const hasNeighbours = images.length > 1;
  const nextSrc = hasNeighbours ? images[(index + 1) % images.length].src : "";
  const prevSrc = hasNeighbours
    ? images[(index - 1 + images.length) % images.length].src
    : "";
  useEffect(() => {
    for (const src of [nextSrc, prevSrc]) {
      if (!src) continue;
      const preload = new Image();
      preload.src = src;
    }
  }, [nextSrc, prevSrc]);

  const image = images[index];

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${index + 1} of ${images.length}`}
      tabIndex={-1}
      className="anim-scrim fixed inset-0 z-[60] flex items-center justify-center bg-ink/90 p-4 outline-none"
      onClick={onClose}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null || images.length < 2) return;
        const delta = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(delta) >= SWIPE_THRESHOLD) {
          if (delta < 0) goNext();
          else goPrev();
        }
        touchStartX.current = null;
      }}
    >
      {/* All controls carry p-3 so their hit areas clear 44px on a phone;
          previously these were bare 28-32px icons hugging the edge. */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 rounded-full p-3 text-linen/80 transition-colors hover:bg-linen/10 hover:text-linen sm:top-6 sm:right-6"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-7 w-7"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      </button>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="Previous photo"
            className="absolute left-2 rounded-full p-3 text-linen/80 transition-colors hover:bg-linen/10 hover:text-linen sm:left-6"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                d="M15 6l-6 6 6 6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="Next photo"
            className="absolute right-2 rounded-full p-3 text-linen/80 transition-colors hover:bg-linen/10 hover:text-linen sm:right-6"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                d="M9 6l6 6-6 6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </>
      )}

      <img
        key={image.src}
        src={image.src}
        alt={image.alt ?? ""}
        className="anim-panel max-h-[85vh] max-w-full rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Without this there's no sense of how far through a gallery you are. */}
      {images.length > 1 && (
        <p className="absolute bottom-5 left-1/2 -translate-x-1/2 font-utility text-xs uppercase tracking-widest text-linen/70 tabular-nums">
          {index + 1} / {images.length}
        </p>
      )}
    </div>
  );
}

export default Lightbox;
