import { useCallback, useEffect, useState, type SyntheticEvent } from "react";

type State = "waiting" | "loaded" | "cached";

/** Tracks when an <img> is ready to show, for photos that fade in.
 *
 *   const { ready, cached, imgProps } = useImageReady({ src });
 *   <img src={...} {...imgProps} />
 *
 * - `ready` turns true when the photo has loaded -- or failed, so a broken
 *   photo never leaves its section hidden -- or when `maxWaitMs` runs out.
 * - `cached` is true when the browser already had the photo as the <img>
 *   was created (a revisit). Callers skip the fade then: fading in
 *   something that was instantly there reads as the page loading again.
 *   React can attach onLoad after a cached photo has already loaded, so
 *   this check is also what stops such a photo being stuck waiting.
 * - `decode: true` also waits for the browser to decode the photo, so a
 *   large one doesn't stutter mid-fade.
 * - The `maxWaitMs` timer runs only while `active` is true: a photo far
 *   down the page shouldn't time out before the guest has scrolled to it.
 * - Pass the image's `src`: if it changes, everything starts over for the
 *   new photo (its own wait, preview and fade).
 */
export function useImageReady({
  src,
  maxWaitMs,
  decode = false,
  active = true,
}: {
  src: string;
  maxWaitMs?: number;
  decode?: boolean;
  active?: boolean;
}) {
  const [state, setState] = useState<State>("waiting");
  // A new photo starts over. Resetting during render (rather than in an
  // effect) is React's recommended way to reset state when a prop changes:
  // the stale "ready" never reaches the screen.
  const [shownSrc, setShownSrc] = useState(src);
  if (src !== shownSrc) {
    setShownSrc(src);
    setState("waiting");
  }
  // Only the first outcome counts: a late onLoad after the timeout, or after
  // the cached check, changes nothing.
  const settle = useCallback(
    (next: State) => setState((s) => (s === "waiting" ? next : s)),
    [],
  );

  const ref = useCallback(
    (img: HTMLImageElement | null) => {
      if (img?.complete) settle("cached");
    },
    [settle],
  );

  useEffect(() => {
    if (!active || maxWaitMs === undefined) return;
    const timer = setTimeout(() => settle("loaded"), maxWaitMs);
    return () => clearTimeout(timer);
    // src: a new photo gets a fresh wait.
  }, [active, maxWaitMs, settle, src]);

  const onLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    if (!decode) return settle("loaded");
    // decode() can reject (e.g. the element was removed); show it anyway.
    e.currentTarget
      .decode()
      .catch(() => {})
      .then(() => settle("loaded"));
  };
  const onError = () => settle("loaded");

  return {
    ready: state !== "waiting",
    cached: state === "cached",
    imgProps: { ref, onLoad, onError },
  };
}
