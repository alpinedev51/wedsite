import type { ReactNode } from "react";

function Eyebrow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`font-utility text-sm uppercase tracking-[0.3em] text-olive ${className}`}
    >
      {children}
    </p>
  );
}

export default Eyebrow;
