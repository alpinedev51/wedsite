interface ColumbineSprigProps {
  className?: string;
}

export function ColumbineSprig({ className }: ColumbineSprigProps) {
  return (
    <svg
      viewBox="0 0 140 190"
      className={className}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <path
          id="columbine-outer-petal"
          d="M0,0 C -8,-18 -4,-34 0,-40 C 4,-34 8,-18 0,0 Z"
          fill="currentColor"
          fillOpacity="0.35"
        />
        <path
          id="columbine-inner-petal"
          d="M0,0 C -5,-10 -3,-20 0,-24 C 3,-20 5,-10 0,0 Z"
          fill="currentColor"
          fillOpacity="0.6"
        />
        <path
          id="columbine-spur"
          d="M0,-38 C 6,-48 6,-58 0,-64"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </defs>

      {/* stem */}
      <path
        d="M70,185 C 69,150 68,120 70,95"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* leaves */}
      <path
        d="M70,150 C 50,145 38,130 40,115 C 55,118 68,130 70,150 Z"
        fill="currentColor"
        fillOpacity="0.3"
      />
      <path
        d="M70,130 C 90,124 100,108 96,94 C 82,100 72,112 70,130 Z"
        fill="currentColor"
        fillOpacity="0.3"
      />

      {/* flower head: five long-spurred outer petals + five inner petals, true to Aquilegia coerulea */}
      <g transform="translate(70,70)" stroke="currentColor">
        <use href="#columbine-spur" transform="rotate(0)" />
        <use href="#columbine-spur" transform="rotate(72)" />
        <use href="#columbine-spur" transform="rotate(144)" />
        <use href="#columbine-spur" transform="rotate(216)" />
        <use href="#columbine-spur" transform="rotate(288)" />

        <use href="#columbine-outer-petal" transform="rotate(0)" />
        <use href="#columbine-outer-petal" transform="rotate(72)" />
        <use href="#columbine-outer-petal" transform="rotate(144)" />
        <use href="#columbine-outer-petal" transform="rotate(216)" />
        <use href="#columbine-outer-petal" transform="rotate(288)" />

        <use href="#columbine-inner-petal" transform="rotate(36)" />
        <use href="#columbine-inner-petal" transform="rotate(108)" />
        <use href="#columbine-inner-petal" transform="rotate(180)" />
        <use href="#columbine-inner-petal" transform="rotate(252)" />
        <use href="#columbine-inner-petal" transform="rotate(324)" />

        <circle r="4" fill="currentColor" fillOpacity="0.85" />
      </g>
    </svg>
  );
}
