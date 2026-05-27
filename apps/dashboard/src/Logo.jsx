/**
 * Logo monerometrics : mark (fork blockchain) + wordmark.
 * Le SVG est inline pour qu'il herite de la couleur via fill="currentColor".
 */
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
      <rect x="10" y="40" width="20" height="20" stroke="currentColor" strokeWidth="6" rx="2"/>
      <line x1="30" y1="50" x2="40" y2="50" stroke="currentColor" strokeWidth="6"/>
      <rect x="40" y="40" width="20" height="20" stroke="currentColor" strokeWidth="6" rx="2"/>
      <line x1="60" y1="50" x2="70" y2="50" stroke="currentColor" strokeWidth="6"/>
      <rect x="70" y="40" width="20" height="20" stroke="currentColor" strokeWidth="6" rx="2"/>
      <line x1="90" y1="50" x2="105" y2="25" stroke="currentColor" strokeWidth="6"/>
      <line x1="90" y1="50" x2="105" y2="75" stroke="currentColor" strokeWidth="6"/>
      <rect x="105" y="15" width="20" height="20" stroke="currentColor" strokeWidth="6" rx="2"/>
      <line x1="125" y1="25" x2="135" y2="25" stroke="currentColor" strokeWidth="6"/>
      <rect x="135" y="15" width="20" height="20" stroke="currentColor" strokeWidth="6" rx="2"/>
      <rect x="105" y="65" width="20" height="20" stroke="currentColor" strokeWidth="6" rx="2"/>
      <line x1="125" y1="75" x2="135" y2="75" stroke="currentColor" strokeWidth="6"/>
      <rect x="135" y="65" width="20" height="20" stroke="currentColor" strokeWidth="6" rx="2"/>
    </svg>
  )
}

export default function Logo() {
  return (
    <div className="flex items-center gap-3">
      <LogoMark size={36} />
      <span
        className="text-base font-medium tracking-tight"
        style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}
      >
        monerometrics.net
      </span>
    </div>
  )
}
