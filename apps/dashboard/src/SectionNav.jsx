import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

const SECTIONS = ['consensus', 'mining', 'network', 'market']

/**
 * Sur près de neuf écrans de contenu, une barre discrète évite de faire
 * défiler à l'aveugle. Elle pose aussi de vraies ancres : un lien vers
 * #market amène directement au marché pair-à-pair.
 */
export default function SectionNav({ view }) {
  const { t } = useTranslation()
  const [active, setActive] = useState(null)
  const [hovered, setHovered] = useState(null)
  // Destination d'un clic en cours. Tant qu'elle est posee, l'observateur se
  // tait : sans cela, les sections traversees pendant le defilement
  // deplaceraient le trait au passage avant qu'il n'arrive a bon port.
  const goingTo = useRef(null)
  const release = useRef(null)

  useEffect(() => {
    if (view !== 'dashboard') return
    const els = SECTIONS.map(id => document.getElementById(id)).filter(Boolean)
    if (!els.length) return
    const obs = new IntersectionObserver(
      entries => {
        const seen = entries.filter(e => e.isIntersecting)
        if (!seen.length) return
        const id = seen[0].target.id
        if (goingTo.current) {
          if (id === goingTo.current) goingTo.current = null
          return
        }
        setActive(id)
      },
      { rootMargin: '-64px 0px -70% 0px' },
    )
    els.forEach(el => obs.observe(el))
    return () => {
      obs.disconnect()
      if (release.current) clearTimeout(release.current)
    }
  }, [view])

  if (view !== 'dashboard') return null

  const go = (e, id) => {
    e.preventDefault()
    // Le trait d'abord, le defilement ensuite : on souligne, on laisse une
    // image au navigateur pour le peindre, puis seulement la page bouge.
    setActive(id)
    goingTo.current = id
    window.history.replaceState(null, '', `#${id}`)
    if (release.current) clearTimeout(release.current)
    // Filet de securite : si la section visee ne declenche jamais
    // l'observateur, le trait resterait fige sur ce choix.
    release.current = setTimeout(() => { goingTo.current = null }, 1500)
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <nav
      className="sticky top-0 z-30 border-b"
      style={{
        background: 'color-mix(in srgb, var(--color-bg) 88%, transparent)',
        borderColor: 'var(--color-border)',
        backdropFilter: 'blur(10px)',
      }}
      aria-label={t('nav.sections')}
    >
      {/* Le trait court d'un bord a l'autre ; seuls les liens restent alignes
          sur le contenu, comme l'en-tete et le pied de page. */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 overflow-x-auto flex gap-1">
        {SECTIONS.map(id => (
          <a
            key={id}
            href={`#${id}`}
            onClick={e => go(e, id)}
            onMouseEnter={() => setHovered(id)}
            onMouseLeave={() => setHovered(prev => (prev === id ? null : prev))}
            className="px-3 py-2.5 text-xs whitespace-nowrap border-b-2 transition-colors"
            style={{
              color: active === id ? 'var(--color-text)' : 'var(--color-dim)',
              // Le survol s'annonce dans le meme orange, simplement eclairci :
              // la section ou l'on est garde le trait plein, celle que l'on
              // pointe n'en recoit qu'une esquisse.
              borderColor: active === id
                ? 'var(--color-accent)'
                : hovered === id
                  ? 'color-mix(in srgb, var(--color-accent) 45%, transparent)'
                  : 'transparent',
            }}
          >{t(`section.${id}`)}</a>
        ))}
      </div>
    </nav>
  )
}
