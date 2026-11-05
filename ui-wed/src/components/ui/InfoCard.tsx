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
      className={`relative flex h-full flex-col gap-3 rounded-2xl border border-walnut/12 bg-linen/60 p-6 shadow-sm transition-all ${isLink ? "group-hover:-translate-y-1 group-hover:border-walnut/25 group-hover:shadow-md" : ""} ${className}`}
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
