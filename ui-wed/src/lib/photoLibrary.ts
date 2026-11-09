import type { GalleryImage } from "@/components/ui/Gallery";

// Turns a folder made by scripts/process-photos.py (AVIF sizes, a WebP
// fallback and manifest.json) into GalleryImages. Used for the Photos page
// (assets/photos) and the Things to Do cards (assets/things-to-do/web).

export interface ManifestEntry {
  width: number;
  height: number;
  widths: number[];
  /** Base64 ThumbHash: a tiny blurred preview shown while the photo loads. */
  thumbhash?: string;
}

/** `files` is an eager `import.meta.glob(..., { query: "?url" })` of the
 * folder's .avif/.webp files, so Vite bundles each one and gives back its
 * hashed URL. Returns a lookup from slug (and alt text) to a GalleryImage. */
export function photoLibrary(
  files: Record<string, string>,
  manifest: Record<string, ManifestEntry>,
) {
  // Keyed by file name alone, so it doesn't matter which folder the glob
  // was written relative to.
  const byName = new Map(
    Object.entries(files).map(([path, url]) => [path.split("/").pop()!, url]),
  );
  const url = (file: string) => {
    const found = byName.get(file);
    if (!found) throw new Error(`Missing photo file: ${file}`);
    return found;
  };

  return function photo(slug: string, alt: string): GalleryImage {
    const entry = manifest[slug];
    if (!entry) throw new Error(`Photo "${slug}" isn't in its manifest.json`);
    return {
      src: url(`${slug}.webp`),
      avifSrcSet: entry.widths
        .map((w) => `${url(`${slug}-${w}w.avif`)} ${w}w`)
        .join(", "),
      width: entry.width,
      height: entry.height,
      thumbhash: entry.thumbhash,
      alt,
    };
  };
}

/** One entry of an image's `sizes`: how wide its frame is drawn from
 * `minWidth` (px of window) up -- in px, or as % of the window (vw). The last
 * entry has no minWidth and covers the narrowest screens. */
export interface FrameWidth {
  minWidth?: number;
  px?: number;
  vw?: number;
}

/** The `sizes` attribute for a photo shown with object-cover in a frame of
 * shape `frameAspect` (width / height: 1 for a square, 1.5 for 3:2).
 * object-cover fills the frame's height, so a photo wider than the frame is
 * drawn wider than it, by the ratio of their shapes -- and the browser
 * should fetch a size big enough for that, not just for the frame. */
export function coverSizes(
  { width, height }: GalleryImage,
  frameAspect: number,
  frames: FrameWidth[],
) {
  const k = width && height ? Math.max(1, width / height / frameAspect) : 1;
  return frames
    .map(({ minWidth, px, vw }) => {
      const size =
        px !== undefined
          ? `${Math.round(px * k)}px`
          : `${Math.round((vw ?? 100) * k)}vw`;
      return minWidth ? `(min-width: ${minWidth}px) ${size}` : size;
    })
    .join(", ");
}
