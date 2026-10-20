import { useEffect, useRef } from "react";

// Tracks which overlays are open, innermost last. A Lightbox can be opened
// from inside an ActivityModal (the modal renders a Gallery), and both listen
// on `window` -- without this, one Escape keypress would close both at once
// and each one's focus trap would fight the other's. Only the top of the
// stack responds.
const overlayStack: symbol[] = [];

// The body's own overflow/padding from before the *first* overlay opened.
// Kept here, not per overlay, because when an ActivityModal and its nested
// Lightbox unmount together (e.g. browser Back with a photo open) React runs
// the modal's cleanup first. If each overlay restored what it saw on open,
// the Lightbox would restore the modal's "hidden" last and leave the next
// page unscrollable. Locking on the first push and unlocking on the last pop
// is correct in any order.
/** True while an ActivityModal or Lightbox is open. Lets other Escape
 * handlers (the mobile nav menu) stand down so one keypress closes one thing. */
export function isOverlayOpen(): boolean {
  return overlayStack.length > 0;
}

let savedBodyStyle: { overflow: string; paddingRight: string } | null = null;

function lockBodyScroll() {
  if (savedBodyStyle) return;
  // Locking body scroll removes the scrollbar, which would shift the page
  // sideways; pad by its width to hold everything still.
  const scrollbarWidth =
    window.innerWidth - document.documentElement.clientWidth;
  const { overflow, paddingRight } = document.body.style;
  savedBodyStyle = { overflow, paddingRight };
  document.body.style.overflow = "hidden";
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }
}

function unlockBodyScroll() {
  if (!savedBodyStyle || overlayStack.length > 0) return;
  document.body.style.overflow = savedBodyStyle.overflow;
  document.body.style.paddingRight = savedBodyStyle.paddingRight;
  savedBodyStyle = null;
}

// Both overlays declared role="dialog" aria-modal="true" without any of the
// behaviour those roles promise: the page scrolled behind them, Tab walked out
// into the content underneath, and closing dropped keyboard focus back to the
// top of the document. This hook is the one place that's fixed, so the two
// components stay in step.
//
// Returns a ref to attach to the dialog panel.
export function useModalBehavior<T extends HTMLElement>(onClose: () => void) {
  const panelRef = useRef<T>(null);

  // `onClose` is an inline arrow at every call site, so its identity changes
  // on each parent render -- depending on it directly would tear down and
  // re-run the whole effect every time the Lightbox changed photo, yanking
  // focus and re-capturing the wrong element to restore to. Kept in a ref so
  // the effect below can run exactly once per mount.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const panel = panelRef.current;
    const token = Symbol("overlay");
    lockBodyScroll();
    overlayStack.push(token);

    // Whatever the guest was on before opening this -- the card they clicked,
    // the gallery thumb -- so focus can go back there on close instead of
    // resetting to the document.
    const previouslyFocused = document.activeElement as HTMLElement | null;

    panel?.focus({ preventScroll: true });

    function onKeyDown(e: KeyboardEvent) {
      // Not the innermost overlay -- let it handle this.
      if (overlayStack[overlayStack.length - 1] !== token) return;

      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;

      // Keep Tab inside the dialog.
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      const at = overlayStack.indexOf(token);
      if (at !== -1) overlayStack.splice(at, 1);
      unlockBodyScroll();
      // Skipped when that element is gone -- e.g. the whole page unmounted.
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, []);

  return panelRef;
}
