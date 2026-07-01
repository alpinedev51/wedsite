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
      className={`font-utility text-sm uppercase tracking-label text-olive ${className}`}
    >
      {children}
    </p>
  );
}

export default Eyebrow;
