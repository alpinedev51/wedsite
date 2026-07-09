import type { CSSProperties, ReactNode } from "react";

function Section({
  children,
  className = "",
  id,
  style,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  style?: CSSProperties;
}) {
  return (
    <section id={id} className={`py-16 sm:py-24 ${className}`} style={style}>
      {children}
    </section>
  );
}

export default Section;
