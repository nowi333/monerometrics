import { useLayoutEffect, useRef, useState } from 'react'

const WIDTH = 240
const MARGIN = 8

export default function InfoTooltip({ text, size = 16 }) {
  const [show, setShow] = useState(false)
  const btnRef = useRef(null)
  const boxRef = useRef(null)
  const [measured, setMeasured] = useState(0)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (!show || !btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    const maxLeft = window.innerWidth - WIDTH - MARGIN
    const left = Math.max(MARGIN, Math.min(r.left + r.width / 2 - WIDTH / 2, maxLeft))
    // Hauteur reelle mesuree apres rendu : une bulle longue posee sous un
    // bouton bas sortait de l'ecran et devenait illisible.
    const h = boxRef.current ? boxRef.current.offsetHeight : 0
    const below = window.innerHeight - r.bottom - MARGIN
    const above = r.top - MARGIN
    const top = (h && h > below && above > below) ? Math.max(MARGIN, r.top - 6 - h) : r.bottom + 6
    setPos({ top: Math.min(top, Math.max(MARGIN, window.innerHeight - h - MARGIN)), left })
  }, [show, measured])

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => { setShow(false); setMeasured(0) }}
        onClick={() => setShow(s => !s)}
        className="inline-flex items-center justify-center rounded-full border text-xs leading-none cursor-help normal-case"
        style={{
          width: `${size}px`, height: `${size}px`,
          borderColor: 'var(--color-border-strong)',
          color: 'var(--color-dim)',
          fontSize: `${Math.round(size * 0.69)}px`,
          textTransform: 'none',
        }}
        aria-label="info"
      >
        ?
      </button>
      {show && (
        <span
          ref={(el) => { boxRef.current = el; if (el && !measured) setMeasured(el.offsetHeight) }}
          className="fixed z-[9999] rounded-lg border p-3 text-xs leading-relaxed shadow-lg normal-case overflow-y-auto"
          style={{
            maxHeight: 'calc(100vh - 16px)',
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
