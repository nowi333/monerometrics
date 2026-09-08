
export function LogoMark({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size * 0.5}
      viewBox="0 0 200 100"
      fill="none"
      className={className}
      style={{ color: 'var(--color-accent)' }}
    >
      {/* Les traits s'arretent dans l'epaisseur du contour, jamais au-dela :
          ils comblent la jonction sans entrer dans le vide du bloc. Extremites
          plates, une extremite arrondie depassait. */}
      <g stroke="currentColor" strokeWidth="5.5" strokeLinecap="butt" strokeLinejoin="round">
        <path d="M27 50 H39"/>
        <path d="M61 50 H73"/>
        <path d="M145 24 H157"/>
        <path d="M145 76 H157"/>
        <path d="M95 50 C107 50 109 24 123 24"/>
        <path d="M95 50 C107 50 109 76 123 76"/>
        <rect x="6" y="40" width="20" height="20" rx="4"/>
        <rect x="40" y="40" width="20" height="20" rx="4"/>
        <rect x="74" y="40" width="20" height="20" rx="4"/>
        <rect x="124" y="14" width="20" height="20" rx="4"/>
        <rect x="158" y="14" width="20" height="20" rx="4"/>
        <rect x="124" y="66" width="20" height="20" rx="4"/>
        <rect x="158" y="66" width="20" height="20" rx="4"/>
      </g>
    </svg>
  )
}

export default function Logo({ onClick }) {
  return (
    <div
      className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none min-w-0"
      onClick={onClick}
      role="button"
      title="monerometrics.net"
    >
      <LogoMark size={36} className="shrink-0" />
      <span
        className="text-xs sm:text-base font-medium tracking-tight whitespace-nowrap"
        style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}
      >
        monerometrics.net
      </span>
    </div>
  )
}
