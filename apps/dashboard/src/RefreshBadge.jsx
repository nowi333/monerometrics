import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getLastRefresh, subscribeRefresh } from './refreshStore'

const KEY = 'mm.refreshBadge'
const ago = (s) => (s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : `${Math.floor(s / 3600)}h`)

/**
 * Un seul repere de fraicheur pour tout le tableau de bord, pose en bas de
 * l'ecran. Le dater panneau par panneau saturait la page d'une information
 * qui est la meme partout : tout se rafraichit ensemble.
 */
export default function RefreshBadge() {
  const { t, i18n } = useTranslation()
  const [at, setAt] = useState(getLastRefresh)
  const [secs, setSecs] = useState(0)
  const [closed, setClosed] = useState(() => {
    try { return localStorage.getItem(KEY) === 'off' } catch { return false }
  })

  useEffect(() => subscribeRefresh(setAt), [])

  useEffect(() => {
    if (at == null) return
    const tick = () => setSecs(Math.max(0, Math.floor((Date.now() - at) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [at])

  if (closed || at == null) return null

  // Seize panneaux sondent en continu : en marche normale l'ecart est toujours
  // de quelques secondes. Le chrono n'a d'interet que lorsque les rafraichissements
  // cessent — onglet en arriere-plan, API muette, reseau coupe.
  const fresh = secs < 20
  const clock = new Date(at).toLocaleTimeString(i18n.language || undefined,
    { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const dismiss = () => {
    setClosed(true)
    try { localStorage.setItem(KEY, 'off') } catch { /* mode prive */ }
  }

  return (
    <div
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 rounded-full border pl-2 pr-1 py-1 text-[10px] font-mono shadow-lg"
      style={{
        background: 'color-mix(in srgb, var(--color-bg-elevated) 92%, transparent)',
        borderColor: 'var(--color-border-strong)',
        color: fresh ? 'var(--color-text-secondary)' : 'var(--color-warn)',
        backdropFilter: 'blur(8px)',
      }}
      title={t('refresh.title', { clock })}
      role="status"
      aria-live="off"
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: fresh ? 'var(--color-success)' : 'var(--color-warn)' }}
        aria-hidden="true"
      />
      <span>{fresh ? t('refresh.live') : ago(secs)}</span>
      <button
        onClick={dismiss}
        title={t('refresh.dismiss')}
        aria-label={t('refresh.dismiss')}
        className="w-4 h-4 inline-flex items-center justify-center rounded-full shrink-0 hover:opacity-70"
        style={{ color: 'var(--color-dim)' }}
      >
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="3" strokeLinecap="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
