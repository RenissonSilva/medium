import type { CSSProperties } from 'react';

// Ícones de traço do layout (mesmos desenhos e espessuras).
const PATHS = {
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  back: <path d="M19 12H5M11 18l-6-6 6-6" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  login: (
    <>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  scan: (
    <>
      <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
      <path d="M4 12h16" />
    </>
  ),
  chevron: <path d="M9 6l6 6-6 6" />,
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h8" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  share: (
    <>
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  replay: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.2a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.3-2.5 4" />
      <path d="M12 17.2v.1" />
    </>
  ),
  flag: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h12l-2.5 4.5L17 13H5" />
    </>
  ),
  soundOn: (
    <>
      <path d="M4 9.5v5h4l5 4v-13l-5 4H4z" />
      <path d="M16.5 9a4.5 4.5 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11" />
    </>
  ),
  soundOff: (
    <>
      <path d="M4 9.5v5h4l5 4v-13l-5 4H4z" />
      <path d="M17 9.5l5 5M22 9.5l-5 5" />
    </>
  ),
  invite: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2.5 20.5a6.5 6.5 0 0 1 13 0" />
      <path d="M19 8v6M16 11h6" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 20,
  stroke = 2.6,
  style,
}: {
  name: IconName;
  size?: number;
  stroke?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {PATHS[name]}
    </svg>
  );
}

const SPARKLE = 'M12 0C12.9 7.2 16.8 11.1 24 12C16.8 12.9 12.9 16.8 12 24C11.1 16.8 7.2 12.9 0 12C7.2 11.1 11.1 7.2 12 0Z';

/** Estrelinha de quatro pontas espalhada pelas telas. */
export function Sparkle({ size, color, style }: { size: number; color: 'paper' | 'yellow'; style: CSSProperties }) {
  return (
    <svg className="sparkle" aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" style={style}>
      <path d={SPARKLE} fill={color === 'paper' ? '#FFFDF7' : '#FFD43B'} />
    </svg>
  );
}

export function Crown({ className }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 64 48">
      <path
        d="M4 16l14 12L32 6l14 22 14-12-6 28H10L4 16z"
        fill="#FFD43B"
        stroke="#0E0F1A"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Dots({ small }: { small?: boolean }) {
  return (
    <span className={small ? 'dots small' : 'dots'} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}
