import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNetworkInfo } from './NetworkContext'

export default function Freshness() {
  const { t } = useTranslation()
  const { lastUpdated, status } = useNetworkInfo()
  const elapsed = (ts) => (ts == null ? null : Math.max(0, Math.floor((Date.now() - ts) / 1000)))
  const [secs, setSecs] = useState(() => elapsed(lastUpdated))



  useEffect(() => {
    const id = setInterval(() => setSecs(elapsed(lastUpdated)), 1000)
    return () => clearInterval(id)
  }, [lastUpdated])

  if (status === 'error') {
    return <span style={{ color: 'var(--color-warn)' }}>{t('state.apiError')}</span>
  }
  if (secs === null) return <span>{t('footer.updating')}</span>

  const label = secs < 5 ? t('footer.live') : t('footer.updated', { ago: `${secs}s` })

  const fresh = secs < 60
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`relative inline-block w-1.5 h-1.5 rounded-full${fresh ? ' mm-live-dot' : ''}`}
        style={{ background: fresh ? 'var(--color-success)' : 'var(--color-dim)', color: 'var(--color-success)' }}
      />
      {label}
    </span>
  )
}
