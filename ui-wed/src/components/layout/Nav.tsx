import { useState } from "react";
import { NavLink } from "react-router-dom";
import { navLinks } from "../../config/nav";
import Container from "../ui/Container";

function Nav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50"
    >
      <Container className="relative flex items-center justify-center py-4">
        <ul className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  `font-utility text-sm uppercase tracking-wider drop-shadow-sm transition-colors ${isActive ? "text-clay" : "text-ink hover:text-clay"
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
          className="absolute top-1/2 right-6 flex -translate-y-1/2 flex-col gap-1.5 md:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
        >
          <span className="h-0.5 w-6 bg-ink drop-shadow-sm" />
          <span className="h-0.5 w-6 bg-ink drop-shadow-sm" />
          <span className="h-0.5 w-6 bg-ink drop-shadow-sm" />
        </button>
      </Container>

      {isOpen && (
        <div className="px-6 pb-4 md:hidden">
          <ul className="flex flex-col gap-1 rounded-2xl border border-walnut/15 bg-linen/90 p-4 backdrop-blur-sm">
            {navLinks.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.to === "/"}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `block py-2 font-utility text-sm uppercase tracking-wider ${isActive ? "text-clay" : "text-ink"
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
