import type { ReactNode } from "react";
import { Link } from "react-router-dom";

function InfoCard({
  icon,
  title,
  description,
  href,
  to,
  className = "",
  decor,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  href?: string;
  to?: string;
  className?: string;
  /** Background flourish, e.g. an absolutely positioned Floral. Drawn behind
   * the text. */
  decor?: ReactNode;
}) {
  const isLink = Boolean(to || href);
  const content = (
    <div
      className={`relative flex h-full flex-col gap-3 rounded-2xl border border-walnut/12 bg-linen/60 p-6 shadow-sm transition-all duration-300 ease-out ${isLink ? "group-hover:-translate-y-1 group-hover:border-walnut/25 group-hover:shadow-md group-focus-visible:-translate-y-1 group-focus-visible:shadow-md group-active:translate-y-0 group-active:scale-[0.99] group-active:shadow-sm" : ""} ${className}`}
    >
      {decor}
      {icon && <div className="relative h-8 w-8 text-clay">{icon}</div>}
      <h3 className="relative font-display text-xl text-center text-walnut">
        {title}
      </h3>
      {description && (
        <p className="relative font-body text-lg text-center text-ink/70">
          {description}
        </p>
      )}
      {/* Marks the card as a link. Always shown, faintly, because phones
          have no hover to discover it; on hover it darkens and nudges
          right. */}
      {isLink && (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="relative mx-auto mt-auto h-5 w-5 text-walnut/45 transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:text-walnut group-focus-visible:translate-x-1 group-focus-visible:text-walnut"
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="group block h-full rounded-2xl">
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="group block h-full rounded-2xl"
      >
        {content}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }

  return content;
}

export default InfoCard;
