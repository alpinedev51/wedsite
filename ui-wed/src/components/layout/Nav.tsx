import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { navLinks } from "../../config/nav";
import Container from "../ui/Container";
import { isOverlayOpen } from "../../hooks/useModalBehavior";

// RSVP is the one action the whole site exists to collect, so it's pulled out
// of the plain link row and given the pill treatment instead of sitting in
// the list looking exactly like "Photos".
const RSVP_PATH = "/rsvp";

function Nav() {
  const [isOpen, setIsOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  // This header is `sticky`, and the linen NameBanner above it scrolls away --
  // so without a background of its own the links end up sitting directly on
  // the hero photograph (and on body text on every other page) with nothing
  // but a drop-shadow for contrast. Frosting it once the page moves fixes
  // that; at scrollY 0 the bar is still over the banner's own linen, so the
  // change is imperceptible there and the top of the page stays clean.
  const [scrolled, setScrolled] = useState(() => window.scrollY > 8);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Escape closes the mobile menu, like every other overlay on the site, and
  // puts focus back on the toggle -- otherwise it drops to <body> when the
  // focused link unmounts. If a modal or photo is open on top, that one owns
  // this Escape and the menu stays put.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || isOverlayOpen()) return;
      setIsOpen(false);
      toggleRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const linkClasses = (isActive: boolean) =>
    // The active page gets a *darker* colour plus an underline. It used to get
    // text-clay (2.76:1 on linen) while every inactive link was text-ink
    // (11.7:1), which made the page you were on the hardest one to read.
    `inline-block border-b-2 pb-0.5 font-utility text-sm uppercase tracking-wider transition-colors ${
      isActive
        ? "border-walnut/70 text-walnut"
        : "border-transparent text-ink hover:text-walnut"
    }`;

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "border-b border-walnut/12 bg-linen/85 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <Container className="relative flex items-center justify-center py-4">
        <ul className="hidden items-center gap-7 lg:flex">
          {navLinks.map((link) =>
            link.to === RSVP_PATH ? (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className="inline-flex items-center rounded-full bg-walnut px-5 py-2 font-utility text-sm uppercase tracking-wider text-linen transition-colors hover:bg-clay"
                >
                  {link.label}
                </NavLink>
              </li>
            ) : (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.to === "/"}
                  className={({ isActive }) => linkClasses(isActive)}
                >
                  {link.label}
                </NavLink>
              </li>
            ),
          )}
        </ul>

        {/* Switches at lg, not md: eight links plus the RSVP pill don't fit
            comfortably in a 768px viewport, so the menu carries the 768-1024
            range instead of cramming the row. */}
        <button
          ref={toggleRef}
          type="button"
          className="absolute top-1/2 right-6 flex -translate-y-1/2 flex-col gap-1.5 p-2 lg:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={isOpen}
          aria-controls="mobile-nav"
          onClick={() => setIsOpen((open) => !open)}
        >
          <span
            className={`h-0.5 w-6 bg-ink transition-transform duration-200 ${
              isOpen ? "translate-y-2 rotate-45" : ""
            }`}
          />
          <span
            className={`h-0.5 w-6 bg-ink transition-opacity duration-200 ${
              isOpen ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`h-0.5 w-6 bg-ink transition-transform duration-200 ${
              isOpen ? "-translate-y-2 -rotate-45" : ""
            }`}
          />
        </button>
      </Container>

      {isOpen && (
        <div id="mobile-nav" className="px-6 pb-4 lg:hidden">
          <ul className="anim-panel flex flex-col gap-1 rounded-2xl border border-walnut/15 bg-linen/95 p-4 backdrop-blur-sm">
            {navLinks.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.to === "/"}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    link.to === RSVP_PATH
                      ? "mt-2 block rounded-full bg-walnut px-5 py-2.5 text-center font-utility text-sm uppercase tracking-wider text-linen"
                      : `block py-2 font-utility text-sm uppercase tracking-wider ${
                          isActive ? "text-walnut" : "text-ink"
                        }`
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}

export default Nav;
