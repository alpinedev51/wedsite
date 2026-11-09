import { useSyncExternalStore } from "react";

// One MediaQueryList and one subscribe function per query, shared by every
// component asking about it. useSyncExternalStore unsubscribes and
// resubscribes whenever it's handed a different subscribe function, so a
// fresh one per render would redo the listener setup on every render.
const lists = new Map<string, MediaQueryList>();
const subscribers = new Map<string, (onChange: () => void) => () => void>();

function listFor(query: string) {
  let list = lists.get(query);
  if (!list) {
    list = window.matchMedia(query);
    lists.set(query, list);
  }
  return list;
}

function subscribeFor(query: string) {
  let subscribe = subscribers.get(query);
  if (!subscribe) {
    subscribe = (onChange) => {
      const list = listFor(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    };
    subscribers.set(query, subscribe);
  }
  return subscribe;
}

/** Whether a CSS media query matches right now, e.g.
 * `useMediaQuery("(min-width: 640px)")`, kept up to date as the window
 * resizes. Read on the very first render (this site has no server
 * rendering), so layouts based on it never flash the wrong value. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscribeFor(query),
    () => listFor(query).matches,
  );
}

/** Tailwind's breakpoints, for matching a grid's `sm:` / `lg:` columns. */
const SM = "(min-width: 640px)";
const LG = "(min-width: 1024px)";

/** How many columns a grid is showing right now, given its column count
 * at each breakpoint -- e.g. `{ base: 1, sm: 2, lg: 3 }` for
 * `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`. Keep the two in step. */
export function useGridColumns({
  base,
  sm = base,
  lg = sm,
}: {
  base: number;
  sm?: number;
  lg?: number;
}) {
  const isSm = useMediaQuery(SM);
  const isLg = useMediaQuery(LG);
  return isLg ? lg : isSm ? sm : base;
}
