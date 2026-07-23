import { useState } from 'react'

export default function InfoTooltip({ text }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(s => !s)}
        className="inline-flex items-center justify-center rounded-full border text-xs leading-none cursor-help normal-case"
        style={{
          width: '16px', height: '16px',
          borderColor: 'var(--color-border-strong)',
          color: 'var(--color-dim)',
          fontSize: '11px',
          textTransform: 'none',
        }}
        aria-label="info"
      >
        ?
      </button>
      {show && (
        <span
          className="absolute z-50 rounded-lg border p-3 text-xs leading-relaxed shadow-lg normal-case"
          style={{
            top: '22px', left: '50%', transform: 'translateX(-50%)',
            width: '240px',
            background: 'var(--color-bg-elevated)',
            borderColor: 'var(--color-border-strong)',
            color: 'var(--color-text-secondary)',
            fontWeight: 400,




            textTransform: 'none',
            letterSpacing: 'normal',
            textAlign: 'left',
          }}
        >
          {text}
        </span>
      )}
    </span>
  )
}
