import { thumbhashPreview } from "@/lib/thumbhash";

/** A photo's blurred ThumbHash preview, filling its parent. Put it before
 * the photo, and give the photo `relative` (or absolute) positioning so it
 * draws on top: absolutely positioned elements otherwise paint above
 * ordinary ones. The parent must be `relative`. */
function ThumbhashBackdrop({ hash }: { hash: string }) {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 bg-cover bg-center"
      // thumbhashPreview caches each decoded hash, so this is cheap to call
      // on every render.
      style={{ backgroundImage: `url(${thumbhashPreview(hash)})` }}
    />
  );
}

export default ThumbhashBackdrop;
