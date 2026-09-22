import { useRef, useState, useEffect, useCallback } from 'react'

/**
 * Bande de navigation sous un graphique : la serie entiere en miniature, avec
 * une fenetre deplacable et redimensionnable qui commande le zoom du graphique.
 *
 * Un zoom a la molette ou au glissement ne dit pas ou l'on se trouve dans la
 * serie. Cette bande le montre en permanence, et rend la plage manipulable
 * sans deviner quel geste est attendu.
 */
export default function ChartNavigator({ values, color, range, onRange, height = 38 }) {
  const ref = useRef(null)
  const [drag, setDrag] = useState(null)
  const n = values.length
  const [lo, hi] = range

  // Silhouette de la serie complete, en aire.
  const path = (() => {
    if (n < 2) return ''
    const min = Math.min(...values)
    const max = Math.max(...values)
    const span = max - min || 1
    const pts = values.map((v, i) => [
      (i / (n - 1)) * 100,
      100 - ((v - min) / span) * 92 - 4,
    ])
    return 'M' + pts.map(p => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' L')
  })()

  const pos = useCallback((e) => {
    const box = ref.current.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - box.left
    return Math.max(0, Math.min(1, x / box.width))
  }, [])

  const start = (mode) => (e) => {
    e.preventDefault()
    // Sans cela, l'evenement remonte au fond de la bande, qui repart en
    // "nouvelle selection" et annule le deplacement ou le redimensionnement.
    if (mode !== 'new') e.stopPropagation()
    setDrag({ mode, from: pos(e), lo, hi })
  }

  useEffect(() => {
    if (!drag) return
    const move = (e) => {
      const p = pos(e)
      const d = p - drag.from
      const width = drag.hi - drag.lo
      if (drag.mode === 'move') {
        // La fenetre garde sa largeur et bute sur les bords.
        const shift = Math.max(-drag.lo, Math.min(1 - drag.hi, d))
        onRange([drag.lo + shift, drag.hi + shift])
      } else if (drag.mode === 'lo') {
        onRange([Math.max(0, Math.min(p, drag.hi - 0.04)), drag.hi])
      } else if (drag.mode === 'hi') {
        onRange([drag.lo, Math.min(1, Math.max(p, drag.lo + 0.04))])
      } else if (drag.mode === 'new') {
        const a = Math.min(drag.from, p)
        const b = Math.max(drag.from, p)
        if (b - a > 0.02) onRange([a, b])
      }
      void width
    }
    const up = () => setDrag(null)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('touchmove', move, { passive: false })
    window.addEventListener('touchend', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', up)
    }
  }, [drag, onRange, pos])

  const pct = (v) => `${(v * 100).toFixed(2)}%`

  return (
    <div
      ref={ref}
      className="relative mt-2 select-none rounded border overflow-hidden"
      style={{ height, borderColor: 'var(--color-border)', background: 'color-mix(in srgb, var(--color-card) 60%, transparent)', touchAction: 'none' }}
      onPointerDown={start('new')}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" aria-hidden="true">
        <path d={`${path} L100,100 L0,100 Z`} fill={color} opacity="0.16" />
        <path d={path} fill="none" stroke={color} strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.75" />
      </svg>

      {/* Ce qui est hors de la fenetre s'estompe : on lit d'un coup ce qu'on regarde. */}
      <div className="absolute inset-y-0 left-0" style={{ width: pct(lo), background: 'color-mix(in srgb, var(--color-bg) 70%, transparent)' }} />
      <div className="absolute inset-y-0 right-0" style={{ width: pct(1 - hi), background: 'color-mix(in srgb, var(--color-bg) 70%, transparent)' }} />

      <div
        className="absolute inset-y-0 cursor-grab active:cursor-grabbing"
        style={{ left: pct(lo), width: pct(hi - lo), borderLeft: `2px solid ${color}`, borderRight: `2px solid ${color}`,
                 background: `color-mix(in srgb, ${color} 8%, transparent)` }}
        onPointerDown={start('move')}
      />
      {/* Poignees larges de 10 px : au doigt, une bordure de 2 px est inattrapable. */}
      <div className="absolute inset-y-0 cursor-ew-resize" style={{ left: `calc(${pct(lo)} - 5px)`, width: 10 }} onPointerDown={start('lo')} />
      <div className="absolute inset-y-0 cursor-ew-resize" style={{ left: `calc(${pct(hi)} - 5px)`, width: 10 }} onPointerDown={start('hi')} />
    </div>
  )
}
