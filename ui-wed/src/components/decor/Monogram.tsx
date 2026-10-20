import { useWeddingConfig } from "../../config/WeddingConfigContext";
import { initialsFrom } from "../../lib/names";

interface MonogramProps {
  className?: string;
}

// Initials come from the couple's names in wedding config, read here so every
// Monogram on the site shows the same pair in the same (groom & bride) order
// without each caller having to build it. Just the rings and "&" until real
// names are known, rather than showing the placeholder "M & M".
export function Monogram({ className }: MonogramProps) {
  const { wedding } = useWeddingConfig();
  const initials = wedding.namesConfigured
    ? initialsFrom(wedding.groomFirstName, wedding.brideFirstName)
    : ["", ""];
  return (
    <svg viewBox="0 0 160 160" className={className} aria-hidden="true">
      <circle
        cx="80"
        cy="80"
        r="70"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle
        cx="80"
        cy="80"
        r="62"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.45"
      />

      {/* cardinal flourish ticks */}
      <g
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.5"
      >
        <path d="M80 10 L80 18" />
        <path d="M80 142 L80 150" />
        <path d="M10 80 L18 80" />
        <path d="M142 80 L150 80" />
      </g>

      <text
        x="52"
        y="95"
        textAnchor="middle"
        fill="currentColor"
        fontFamily="'Pinyon Script', cursive"
        fontSize="46"
      >
        {initials[0]}
      </text>
      <text
        x="80"
        y="88"
        textAnchor="middle"
        fill="currentColor"
        fontFamily="'Fraunces', serif"
        fontSize="18"
        opacity="0.75"
      >
        &amp;
      </text>
      <text
        x="108"
        y="95"
        textAnchor="middle"
        fill="currentColor"
        fontFamily="'Pinyon Script', cursive"
        fontSize="46"
      >
        {initials[1]}
      </text>

      <path
        d="M52 112 Q80 121 108 112"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}
