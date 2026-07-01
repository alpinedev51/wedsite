interface SprigProps {
  className?: string;
  mirrored?: boolean;
}

export function EucalyptusSprig({ className, mirrored = false }: SprigProps) {
  return (
    <svg
      viewBox="0 0 360 200"
      className={className}
      style={mirrored ? { transform: "scaleX(-1)" } : undefined}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Large elongated leaf */}
        <g id="leaf-lg">
          <path
            d="M 0 0 C 15 -25, 45 -30, 70 -10 C 50 15, 20 20, 0 0 Z"
            fill="currentColor"
            fillOpacity="0.15"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M 0 0 Q 35 -10 68 -10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </g>

        {/* Medium leaf */}
        <g id="leaf-md">
          <path
            d="M 0 0 C 12 -20, 35 -24, 55 -8 C 40 12, 15 15, 0 0 Z"
            fill="currentColor"
            fillOpacity="0.15"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M 0 0 Q 25 -8 53 -8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </g>

        {/* Small tip leaf */}
        <g id="leaf-sm">
          <path
            d="M 0 0 C 8 -15, 25 -18, 40 -5 C 28 8, 12 10, 0 0 Z"
            fill="currentColor"
            fillOpacity="0.15"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M 0 0 Q 18 -5 38 -5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </g>
      </defs>

      {/* Flatter, sweeping horizontal stem */}
      <path
        d="M 30 160 Q 150 180 280 70"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Denser foliage alternating along the curve */}
      <g stroke="currentColor" fill="currentColor">
        {/* Base cluster */}
        <use href="#leaf-lg" transform="translate(54, 163) rotate(55)" />
        <use href="#leaf-lg" transform="translate(54, 163) rotate(-45)" />

        {/* Lower-mid cluster */}
        <use href="#leaf-md" transform="translate(78, 163) rotate(40)" />
        <use href="#leaf-md" transform="translate(78, 163) rotate(-60)" />

        {/* Mid cluster */}
        <use href="#leaf-lg" transform="translate(115, 158) rotate(35)" />
        <use href="#leaf-lg" transform="translate(115, 158) rotate(-70)" />

        {/* Center cluster */}
        <use href="#leaf-md" transform="translate(153, 148) rotate(25)" />
        <use href="#leaf-md" transform="translate(153, 148) rotate(-80)" />

        {/* Upper-mid cluster */}
        <use href="#leaf-lg" transform="translate(190, 131) rotate(10)" />
        <use href="#leaf-lg" transform="translate(190, 131) rotate(-90)" />

        {/* High cluster */}
        <use href="#leaf-md" transform="translate(228, 109) rotate(-5)" />
        <use href="#leaf-md" transform="translate(228, 109) rotate(-100)" />

        {/* Tapering off */}
        <use href="#leaf-sm" transform="translate(254, 91) rotate(-15)" />
        <use href="#leaf-sm" transform="translate(254, 91) rotate(-105)" />

        {/* End tip */}
        <use href="#leaf-sm" transform="translate(280, 70) rotate(-50)" />

        {/* Tiny seeded berry clusters to break up the leaves */}
        <circle cx="100" cy="161" r="3" fillOpacity="0.8" />
        <circle cx="106" cy="164" r="2.5" fillOpacity="0.8" />
        <circle cx="98" cy="168" r="2" fillOpacity="0.8" />

        <circle cx="210" cy="120" r="3" fillOpacity="0.8" />
        <circle cx="216" cy="116" r="2.5" fillOpacity="0.8" />
        <circle cx="206" cy="113" r="2" fillOpacity="0.8" />
      </g>
    </svg>
  );
}
