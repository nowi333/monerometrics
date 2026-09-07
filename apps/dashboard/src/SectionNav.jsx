import { useEffect, useState } from 'react'
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

  useEffect(() => {
    if (view !== 'dashboard') return
    const els = SECTIONS.map(id => document.getElementById(id)).filter(Boolean)
    if (!els.length) return
    const obs = new IntersectionObserver(
      entries => {
        const seen = entries.filter(e => e.isIntersecting)
        if (seen.length) setActive(seen[0].target.id)
      },
      { rootMargin: '-64px 0px -70% 0px' },
    )
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [view])

  if (view !== 'dashboard') return null

  const go = (e, id) => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.history.replaceState(null, '', `#${id}`)
  }

  return (
    <nav
      className="sticky top-0 z-30 -mx-3 sm:-mx-6 mb-2 px-3 sm:px-6 border-b overflow-x-auto"
      style={{
        background: 'color-mix(in srgb, var(--color-bg) 88%, transparent)',
        borderColor: 'var(--color-border)',
        backdropFilter: 'blur(10px)',
      }}
      aria-label={t('nav.sections')}
    >
      <div className="flex gap-1">
        {SECTIONS.map(id => (
          <a
            key={id}
            href={`#${id}`}
            onClick={e => go(e, id)}
            className="px-3 py-2.5 text-xs whitespace-nowrap border-b-2 transition-colors"
            style={{
              color: active === id ? 'var(--color-text)' : 'var(--color-dim)',
              borderColor: active === id ? 'var(--color-accent)' : 'transparent',
            }}
          >{t(`section.${id}`)}</a>
        ))}
      </div>
    </nav>
  )
}
