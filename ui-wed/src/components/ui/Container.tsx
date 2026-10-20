import type { ReactNode } from "react";

// Gutter only grows with width. It used to read `px-6 sm:px-8 lg:px-6`, which
// shrank the padding back down at large widths -- almost certainly a typo.
function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-5xl px-6 sm:px-8 ${className}`}>
      {children}
    </div>
  );
}

export default Container;
