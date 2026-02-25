interface ArgonautLogoProps {
  size?: number;
  className?: string;
}

export default function ArgonautLogo({ size = 48, className = "" }: ArgonautLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="50%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
        <filter id="logo-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g transform="translate(24,24)" filter="url(#logo-glow)">
        {/* Outer ring */}
        <circle cx="0" cy="0" r="18" fill="none" stroke="url(#logo-grad)" strokeWidth="1.8" opacity="0.9" />
        {/* Inner ring */}
        <circle cx="0" cy="0" r="7" fill="none" stroke="url(#logo-grad)" strokeWidth="1.8" />
        {/* Center dot */}
        <circle cx="0" cy="0" r="2" fill="url(#logo-grad)" />
        {/* 8 spokes */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          return (
            <line
              key={angle}
              x1={Math.cos(rad) * 7}
              y1={Math.sin(rad) * 7}
              x2={Math.cos(rad) * 18}
              y2={Math.sin(rad) * 18}
              stroke="url(#logo-grad)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          );
        })}
        {/* 8 handle circles */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          return (
            <circle
              key={`dot-${angle}`}
              cx={Math.cos(rad) * 20.5}
              cy={Math.sin(rad) * 20.5}
              r="2.2"
              fill="url(#logo-grad)"
            />
          );
        })}
      </g>
    </svg>
  );
}
