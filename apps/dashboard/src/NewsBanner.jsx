import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { makeDateFmt } from './chartDate'
import { api } from './api'
import { usePolledData } from './usePolledData'

const KEY = 'mm.newsSeen'

/**
 * La derniere annonce du projet Monero lui-meme, rien d'autre.
 *
 * Elles paraissent environ toutes les deux semaines : le bandeau porte donc
 * toujours sa date, sinon un billet d'il y a un mois passerait pour une
 * nouvelle du jour sur un site dont tout le reste est en temps reel.
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
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(KEY) } catch { return null }
  })

  if (status !== 'ok') return null
  const item = data.items[0]
  if (!item || dismissed === item.id) return null

  const hide = () => {
    setDismissed(item.id)
    try { localStorage.setItem(KEY, item.id) } catch { /* mode prive */ }
  }

  return (
    <div
      className="mb-5 rounded-lg border flex items-center gap-3 px-3 py-2.5"
      style={{
        background: 'color-mix(in srgb, var(--color-accent) 6%, var(--color-card))',
        borderColor: 'color-mix(in srgb, var(--color-accent) 22%, var(--color-border))',
      }}
    >
      <span
        className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded shrink-0"
        style={{ background: 'color-mix(in srgb, var(--color-accent) 16%, transparent)', color: 'var(--color-accent)' }}
      >{t('news.label')}</span>

      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[13px] min-w-0 flex-1 truncate hover:underline"
        style={{ color: 'var(--color-text)' }}
        title={item.title}
      >{item.title}</a>

      <span className="text-[11px] font-mono shrink-0 hidden sm:inline" style={{ color: 'var(--color-dim)' }}>
        {D.dayMonthYear(new Date(item.published_unix * 1000))}
      </span>

      <button
        onClick={hide}
        title={t('news.dismiss')}
        aria-label={t('news.dismiss')}
        className="w-5 h-5 inline-flex items-center justify-center rounded shrink-0 hover:opacity-70"
        style={{ color: 'var(--color-dim)' }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </button>
    </div>
  )
}
