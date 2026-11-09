import { thumbHashToDataURL } from "thumbhash";

// Decoding a ThumbHash is quick, but a Photos page has dozens, and they'd
// otherwise be redone every time a gallery remounts.
const previewCache = new Map<string, string>();

/** A base64 ThumbHash (as stored in manifest.json) as a tiny blurred image,
 * ready to use as a CSS background-image URL. */
export function thumbhashPreview(hash: string) {
  let url = previewCache.get(hash);
  if (!url) {
    const bytes = Uint8Array.from(atob(hash), (c) => c.charCodeAt(0));
    url = thumbHashToDataURL(bytes);
    previewCache.set(hash, url);
  }
  return url;
}
