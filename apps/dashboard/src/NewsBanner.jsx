import { useTranslation } from 'react-i18next'
import { makeDateFmt } from './chartDate'
import { api } from './api'
import { usePolledData } from './usePolledData'

const SECONDS_PER_ITEM = 9

/**
 * Les annonces du projet Monero lui-meme, en bandeau defilant.
 *
 * Le defilement s'arrete au survol et au focus : une cible qui bouge ne se
 * clique pas. Il est aussi desactive pour qui demande moins d'animation.
 * Chaque entree porte sa date, parce qu'elles paraissent environ toutes les
 * deux semaines et qu'un billet d'un mois ne doit pas passer pour du direct.
 */
export default function NewsBanner() {
  const { t, i18n } = useTranslation()
  const D = makeDateFmt(i18n.language)
  const { data, status } = usePolledData(
    () => api.news(),
    d => d && d.items && d.items.length > 0,
    [],
    1800000,
  )
  if (status !== 'ok') return null
  const items = data.items
  if (!items.length) return null

  const entry = (item, key) => (
    <a
      key={key}
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-baseline gap-2 px-5 text-[13px] hover:underline"
      style={{ color: 'var(--color-text)' }}
    >
      <span aria-hidden="true" style={{ color: 'var(--color-success)' }}>›</span>
      {item.title}
      <span className="text-[11px] font-mono" style={{ color: 'var(--color-dim)' }}>
        {D.dayMonthYear(new Date(item.published_unix * 1000))}
      </span>
    </a>
  )

  return (
    <div
      className="mb-5 rounded-lg border flex items-center gap-2 px-3 py-2 overflow-hidden"
      style={{
        background: 'color-mix(in srgb, var(--color-success) 7%, var(--color-card))',
        borderColor: 'color-mix(in srgb, var(--color-success) 28%, var(--color-border))',
      }}
    >
      <span
        className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded shrink-0"
        style={{ background: 'color-mix(in srgb, var(--color-success) 16%, transparent)', color: 'var(--color-success)' }}
      >{t('news.label')}</span>

      <div className="mm-ticker flex-1 min-w-0 overflow-hidden">
        <div
          className="mm-ticker-track"
          style={{ '--mm-ticker-duration': `${items.length * SECONDS_PER_ITEM * 2}s` }}
        >
          {/* La liste est doublee pour que la boucle se referme sans saut. */}
          {items.map((it, i) => entry(it, `a${i}`))}
          {items.map((it, i) => entry(it, `b${i}`))}
        </div>
      </div>

    </div>
  )
}
