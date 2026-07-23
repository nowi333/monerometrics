import { useLayoutEffect, useRef, useState } from 'react'

const WIDTH = 240
const MARGIN = 8

export default function InfoTooltip({ text }) {
  const [show, setShow] = useState(false)
  const btnRef = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (!show || !btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    const maxLeft = window.innerWidth - WIDTH - MARGIN
    const left = Math.max(MARGIN, Math.min(r.left + r.width / 2 - WIDTH / 2, maxLeft))
    setPos({ top: r.bottom + 6, left })
  }, [show])

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={btnRef}
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
          className="fixed z-[9999] rounded-lg border p-3 text-xs leading-relaxed shadow-lg normal-case"
          style={{
            top: `${pos.top}px`, left: `${pos.left}px`,
            width: `${WIDTH}px`,
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
