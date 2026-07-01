interface MountainRidgeProps {
  className?: string;
}

export function MountainRidge({ className }: MountainRidgeProps) {
  return (
    <svg
      viewBox="0 0 1440 260"
      className={className}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0,180 L110,125 L190,155 L280,95 L360,145 L450,85 L540,135 L620,75 L710,125 L800,65 L890,115 L980,55 L1070,105 L1160,65 L1250,115 L1330,90 L1440,130 L1440,260 L0,260 Z"
        fill="var(--color-slate3)"
        fillOpacity="0.35"
      />
      <path
        d="M0,220 L70,165 L140,195 L220,115 L290,175 L370,105 L440,165 L520,80 L590,155 L670,95 L750,165 L820,125 L900,185 L970,135 L1050,195 L1120,145 L1200,205 L1270,165 L1350,215 L1440,190 L1440,260 L0,260 Z"
        fill="var(--color-olive2)"
        fillOpacity="0.55"
      />
      <path
        d="M0,220 L70,165 L140,195 L220,115 L290,175 L370,105 L440,165 L520,80 L590,155 L670,95 L750,165 L820,125 L900,185 L970,135 L1050,195 L1120,145 L1200,205 L1270,165 L1350,215 L1440,190"
        fill="none"
        stroke="var(--color-walnut)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
    </svg>
  );
}
