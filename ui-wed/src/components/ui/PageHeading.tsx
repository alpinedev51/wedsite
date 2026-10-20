import type { ReactNode } from "react";

// The big h1 under each public page's Eyebrow, so every page title steps
// up in size the same way.
function PageHeading({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h1 className={`text-3xl sm:text-4xl lg:text-5xl ${className}`}>
      {children}
    </h1>
  );
}

export default PageHeading;
