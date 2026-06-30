interface SprigProps {
  className?: string;
  mirrored?: boolean;
}

export function EucalyptusSpring({ className, mirrored = false }: SprigProps) {
  return (
    <svg
      viewBox="0 0 220 120"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      style={mirrored ? { transform: "scaleX(-1)" } : undefined}
      aria-hidden="true"
    >
      <path d="M8 112 C 70 96, 130 64, 212, 16" />
    </svg>
  );
}
