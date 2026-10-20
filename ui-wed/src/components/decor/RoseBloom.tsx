// Not used anywhere right now (it was dropped from WeddingInfoHub). Kept
// for possible reuse as decoration.
interface RoseProps {
  className?: string;
}

export function RoseBloom({ className }: RoseProps) {
  return (
    <svg
      viewBox="0 0 100 130"
      className={className}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="50"
        cy="42"
        r="22"
        fill="currentColor"
        fillOpacity="0.18"
        stroke="none"
      />
      <path
        d="M50 42 C 42 36, 40 26, 50 22 C 60 26, 58 36, 50 42 Z"
        fill="currentColor"
        fillOpacity="0.3"
      />
      <path
        d="M50 42 C 58 36, 68 38, 68 48 C 60 50, 52 48, 50 42 Z"
        fill="currentColor"
        fillOpacity="0.3"
      />
      <path
        d="M50 42 C 58 48, 58 58, 48 60 C 44 52, 44 46, 50 42 Z"
        fill="currentColor"
        fillOpacity="0.3"
      />
      <path
        d="M50 42 C 40 46, 32 44, 32 34 C 40 32, 48 36, 50 42 Z"
        fill="currentColor"
        fillOpacity="0.3"
      />
      <circle cx="50" cy="42" r="22" fill="none" />
      <path d="M50 64 C 50 84, 50 106, 47 126" fill="none" />
      <path
        d="M48 90 C 38 90, 30 98, 28 108 C 38 110, 47 104, 48 90 Z"
        fill="currentColor"
        fillOpacity="0.25"
      />
      <path
        d="M49 106 C 59 106, 67 112, 70 121 C 60 124, 50 119, 49 106 Z"
        fill="currentColor"
        fillOpacity="0.25"
      />
    </svg>
  );
}
