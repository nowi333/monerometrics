
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
      {/* Traits sous les blocs, mordant dans leur contour : bout a bout,
          la jonction laissait une encoche. La bifurcation part et arrive a
          l'horizontale plutot que d'aborder les blocs en biais. */}
      <g stroke="currentColor" strokeWidth="5.5" strokeLinejoin="round">
        <g strokeLinecap="butt">
          <path d="M26 50 H40"/>
          <path d="M60 50 H74"/>
          <path d="M144 24 H158"/>
          <path d="M144 76 H158"/>
        </g>
        <g strokeLinecap="round">
          <path d="M93 50 C104 50 105 24 125 24"/>
          <path d="M93 50 C104 50 105 76 125 76"/>
        </g>
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
