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
  const content = (
    <div
      className={`relative flex h-full flex-col gap-3 rounded-2xl border border-walnut/12 bg-linen/60 p-6 text-left shadow-sm transition-colors hover:border-walnut/25 hover:bg-linen ${className}`}
    >
      {decor}
      {icon && <div className="relative h-8 w-8 text-clay">{icon}</div>}
      <h3 className="relative font-display text-lg text-walnut">{title}</h3>
      {description && (
        <p className="relative font-body text-sm text-ink/70">{description}</p>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block h-full">
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="block h-full">
        {content}
      </a>
    );
  }

  return content;
}

export default InfoCard;
