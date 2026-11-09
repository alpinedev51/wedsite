import ThumbhashBackdrop from "./ThumbhashBackdrop";
import { useImageReady } from "@/hooks/useImageReady";

// A photo that fills its parent and appears gracefully:
//  1. A blurred preview (from the photo's ThumbHash) shows straight away, so
//     the space is never an empty box.
//  2. The real photo downloads, is decoded, and only then fades in over the
//     preview. Waiting for decode() avoids a stutter mid-fade on big images.
//  3. A photo that's already in the browser's cache (a revisit) appears at
//     once, with no fade -- fading in something that was instantly there
//     reads as the page loading again.
//
// The parent must be `relative` with a fixed size (an aspect-ratio box or a
// set height), and usually `overflow-hidden`: both layers here are
// absolutely positioned to fill it.

function SmartImage({
  src,
  alt,
  avifSrcSet,
  sizes,
  thumbhash,
  loading = "lazy",
  className = "",
}: {
  src: string;
  alt: string;
  avifSrcSet?: string;
  /** How wide the photo is drawn, so the browser picks the right srcset
   * size. */
  sizes?: string;
  thumbhash?: string;
  /** "eager" for photos on screen when the page opens. */
  loading?: "lazy" | "eager";
  /** Extra classes for the <img> itself, e.g. a hover zoom. */
  className?: string;
}) {
  const { ready, cached, imgProps } = useImageReady({ src, decode: true });
  const phase = cached ? "instant" : ready ? "fading" : "waiting";

  const pictureFade = {
    waiting: "opacity-0",
    fading: "opacity-100 transition-opacity duration-500 ease-out",
    instant: "opacity-100",
  }[phase];

  return (
    <>
      {thumbhash && <ThumbhashBackdrop hash={thumbhash} />}
      {/* The fade is on the <picture>, not the <img>, so the img keeps its
          own transitions (e.g. a hover zoom) untouched. */}
      <picture className={`absolute inset-0 block ${pictureFade}`}>
        {avifSrcSet && (
          <source type="image/avif" srcSet={avifSrcSet} sizes={sizes} />
        )}
        <img
          {...imgProps}
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          className={`h-full w-full object-cover ${className}`}
        />
      </picture>
    </>
  );
}

export default SmartImage;
