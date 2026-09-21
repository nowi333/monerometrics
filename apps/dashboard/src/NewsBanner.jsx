import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { makeDateFmt } from './chartDate'
import { api } from './api'
import { usePolledData } from './usePolledData'

const SECONDS_PER_ITEM = 9

// Chaque source a sa pastille : on doit savoir d'ou vient une news sans lire
// l'URL. Les libelles sont des noms propres, ils ne se traduisent pas.
const SOURCES = {
  getmonero: { label: 'Monero', color: 'var(--color-accent)' },
  observer: { label: 'Observer', color: 'var(--color-info)' },
  github: { label: 'GitHub', color: 'var(--color-dim)' },
}

/**
 * Les annonces Monero de trois sources, en bandeau defilant et navigable.
 *
 * Le defilement est pilote en JavaScript plutot qu'en animation CSS, pour que
 * la bande reste une vraie zone scrollable : on peut la faire glisser au doigt
 * ou a la souris, et les fleches deplacent d'une entree. Une animation CSS
 * aurait fige la position et rendu la navigation manuelle impossible.
 *
 * Il s'arrete au survol, au focus clavier et pendant qu'on la manipule : une
 * cible qui bouge ne se clique pas. Il est desactive pour qui demande moins
 * d'animation, la bande restant alors librement scrollable.
 *
 * Chaque entree porte sa date : un billet d'un mois ne doit pas passer pour
 * du direct.
 */
export default function NewsBanner() {
  const { t, i18n } = useTranslation()
  const D = makeDateFmt(i18n.language)
  const { data, status } = usePolledData(
    () => api.news(),
    d => d && d.items && d.items.length > 0,
    [],
    1800000,
    0,
  )

  const scroller = useRef(null)
  // Ces drapeaux changent a chaque image ou a chaque geste : les garder hors
  // de l'etat React evite de reconstruire la bande en plein defilement.
  const held = useRef(false)
  const hovered = useRef(false)
  const nudging = useRef(false)
  const dragged = useRef(false)
  const nudgeTimer = useRef(0)

  const count = data && data.items ? data.items.length : 0

  // La liste est doublee : on ramene le scroll d'une demi-largeur des qu'il la
  // depasse, dans un sens comme dans l'autre, et la boucle ne montre pas de saut.
  const wrap = useCallback((el) => {
    const half = el.scrollWidth / 2
    if (half <= 0) return
    if (el.scrollLeft >= half) el.scrollLeft -= half
    else if (el.scrollLeft < 0) el.scrollLeft += half
  }, [])

  useEffect(() => {
    const el = scroller.current
    if (!el || !count) return
    const slow = window.matchMedia('(prefers-reduced-motion: reduce)')
    let raf = 0
    let last = 0

    const step = (now) => {
      raf = requestAnimationFrame(step)
      const dt = last ? Math.min(now - last, 100) : 0
      last = now
      if (slow.matches || held.current || hovered.current || nudging.current) return
      const half = el.scrollWidth / 2
      if (half <= 0) return
      el.scrollLeft += (half / (count * SECONDS_PER_ITEM)) * (dt / 1000)
      wrap(el)
    }
    raf = requestAnimationFrame(step)
    const timer = nudgeTimer
    return () => { cancelAnimationFrame(raf); clearTimeout(timer.current) }
  }, [count, wrap])

  // Glisser a la souris. Le tactile passe par le scroll natif, qui gere seul
  // l'inertie ; on se contente d'y recoller la boucle.
  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse') return
    const el = scroller.current
    held.current = true
    dragged.current = false
    const start = e.clientX
    let from = el.scrollLeft
    const move = (ev) => {
      if (Math.abs(ev.clientX - start) > 3) dragged.current = true
      const half = el.scrollWidth / 2
      let next = from - (ev.clientX - start)
      // Un navigateur refuse un scroll negatif : pour que la boucle tourne
      // aussi vers l'arriere, on repart d'une demi-largeur plus loin et on
      // deplace l'origine du geste d'autant, sinon la bande sauterait.
      if (next < 0) { next += half; from += half }
      else if (next >= half) { next -= half; from -= half }
      el.scrollLeft = next
    }
    const up = () => {
      held.current = false
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // Un lien ne doit pas s'ouvrir a la fin d'un glissement.
  const onClickCapture = (e) => {
    if (dragged.current) {
      e.preventDefault()
      e.stopPropagation()
      dragged.current = false
    }
  }

  const nudge = (dir) => {
    const el = scroller.current
    const w = el.querySelector('a')
    // Meme raison qu'au glissement : on ne peut pas reculer sous zero.
    if (dir < 0 && el.scrollLeft < (w ? w.offsetWidth : 240)) el.scrollLeft += el.scrollWidth / 2
    el.scrollBy({ left: dir * (w ? w.offsetWidth : 240), behavior: 'smooth' })
    // Le defilement automatique reprend une fois le glissement doux termine.
    nudging.current = true
    clearTimeout(nudgeTimer.current)
    nudgeTimer.current = setTimeout(() => { nudging.current = false }, 700)
  }

  const band = (inner) => (
    <div
      className="mt-5 border-t border-b overflow-hidden"
      style={{
        background: 'color-mix(in srgb, var(--color-success) 7%, var(--color-card))',
        borderColor: 'color-mix(in srgb, var(--color-success) 28%, var(--color-border))',
      }}
    >{inner}</div>
  )

  // La bande garde sa place pendant le chargement : sans cela elle apparaissait
  // apres le reste et poussait toute la page vers le bas.
  if (status === 'loading') return band(<div className="py-2 text-[13px] leading-6">&nbsp;</div>)
  if (status !== 'ok') return null
  const items = data.items
  if (!items.length) return null

  const entry = (item, key) => (
    <a
      key={key}
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      draggable="false"
      className="inline-flex items-center gap-2 px-5 text-[13px] hover:underline"
      style={{ color: 'var(--color-text)' }}
    >
      <span
        className="text-[10px] font-mono uppercase tracking-wider leading-none px-1.5 py-[3px] rounded shrink-0"
        style={{
          color: (SOURCES[item.source] || SOURCES.getmonero).color,
          border: `1px solid color-mix(in srgb, ${(SOURCES[item.source] || SOURCES.getmonero).color} 45%, transparent)`,
          background: `color-mix(in srgb, ${(SOURCES[item.source] || SOURCES.getmonero).color} 12%, transparent)`,
        }}
      >{(SOURCES[item.source] || SOURCES.getmonero).label}</span>
      {item.title}
      <span className="text-[11px] font-mono" style={{ color: 'var(--color-dim)' }}>
        {D.dayMonthYear(new Date(item.published_unix * 1000))}
      </span>
    </a>
  )

  const arrow = (dir, path) => (
    <button
      type="button"
      onClick={() => nudge(dir)}
      aria-label={t(dir < 0 ? 'news.prev' : 'news.next')}
      className="mm-ticker-arrow absolute top-0 bottom-0 z-10 px-2 hidden sm:flex items-center opacity-70 hover:opacity-100 transition-opacity"
      style={{ [dir < 0 ? 'left' : 'right']: 0, color: 'var(--color-text)' }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path} /></svg>
    </button>
  )

  return band(
    <div
      className="mm-ticker relative"
      onMouseEnter={() => { hovered.current = true }}
      onMouseLeave={() => { hovered.current = false }}
      onFocusCapture={() => { hovered.current = true }}
      onBlurCapture={() => { hovered.current = false }}
    >
      {arrow(-1, 'm15 18-6-6 6-6')}
      <div
        ref={scroller}
        className="mm-ticker-scroll py-2"
        role="group"
        aria-label={t('news.label')}
        onPointerDown={onPointerDown}
        onClickCapture={onClickCapture}
        onScroll={(e) => { if (!held.current && !nudging.current) wrap(e.currentTarget) }}
      >
        <div className="mm-ticker-track">
          {/* La liste est doublee pour que la boucle se referme sans saut. */}
          {items.map((it, i) => entry(it, `a${i}`))}
          {items.map((it, i) => entry(it, `b${i}`))}
        </div>
      </div>
      {arrow(1, 'm9 18 6-6-6-6')}
    </div>,
  )
}
