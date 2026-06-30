interface SprigProps {
  className?: string;
  mirrored?: boolean;
}

export function EucalyptusSpring({ className, mirrored = false }: SprigProps) {
  return (
    <svg
      viewBox="0 0 220 140"
      className={className}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={mirrored ? { transform: "scaleX(-1)" } : undefined}
      aria-hidden="true"
    >
      <path d="M4 132 C 72 110, 134 74, 212 18" fill="none" />
      <ellipse
        cx="34"
        cy="114"
        rx="16"
        ry="9"
        transform="rotate(-28 34 114)"
        fill="currentColor"
        fillOpacity="0.35"
      />
      <ellipse
        cx="64"
        cy="95"
        rx="17"
        ry="9.5"
        transform="rotate(-24 64 95)"
        fill="currentColor"
        fillOpacity="0.35"
      />
      <ellipse
        cx="96"
        cy="76"
        rx="16"
        ry="9"
        transform="rotate(-26 96 76)"
        fill="currentColor"
        fillOpacity="0.35"
      />
      <ellipse
        cx="128"
        cy="56"
        rx="15"
        ry="8.5"
        transform="rotate(-22 128 56)"
        fill="currentColor"
        fillOpacity="0.35"
      />
      <ellipse
        cx="158"
        cy="38"
        rx="13"
        ry="7.5"
        transform="rotate(-26 158 38)"
        fill="currentColor"
        fillOpacity="0.35"
      />
      <ellipse
        cx="184"
        cy="24"
        rx="11"
        ry="6.5"
        transform="rotate(-22 184 24)"
        fill="currentColor"
        fillOpacity="0.35"
      />
    </svg>
  );
}
