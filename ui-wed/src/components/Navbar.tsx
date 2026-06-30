import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { wedding } from "../config/wedding";

const links = [
  { to: "/", label: "Home" },
  { to: "/our-story", label: "Our Story" },
  { to: "/rsvp", label: "RSVP" },
  { to: "/registry", label: "Registry" },
];

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-walnut/15 bg-linen/90 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link
          to="/"
          className="font-heading text-lg tracking-wide text-walnut"
          onClick={() => setIsOpen(false)}
        >
          {wedding.coupleNames}
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                className={({ isActive }) =>
                  `font-body text-sm uppercase tracking-wider transition-colors ${
                    isActive ? "text-clay" : "text-ink hover:text-clay"
                  }`
                }
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="flex flex-col gap-1.5 md:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
        >
          <span className="h-0.5 w-6 bg-ink" />
          <span className="h-0.5 w-6 bg-ink" />
          <span className="h-0.5 w-6 bg-ink" />
        </button>
      </nav>

      {isOpen && (
        <ul className="flex flex-col gap-1 border-t border-walnut/15 px-6 pb-4 md:hidden">
          {links.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `block py-2 font-body text-sm uppercase tracking-wider ${
                    isActive ? "text-clay" : "text-ink"
                  }`
                }
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}

export default Navbar;
