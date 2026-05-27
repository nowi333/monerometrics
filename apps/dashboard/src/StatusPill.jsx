import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api, timeAgo } from './api'

/**
 * Pill de status sync monerod live.
 * Affiche : etat (synced/syncing) + bloc actuel + age du dernier bloc.
 * Refresh toutes les 15s.
 */
export default function StatusPill() {
  const { t } = useTranslation()
  const [info, setInfo] = useState(null)

  useEffect(() => {
    const fetch = () => api.networkInfo().then(setInfo).catch(() => setInfo(null))
    fetch()
    const interval = setInterval(fetch, 15000)
    return () => clearInterval(interval)
  }, [])

  if (!info) {
    return (
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
        style={{
          background: 'var(--color-warning-bg)',
          border: '0.5px solid var(--color-warning-border)',
          color: 'var(--color-warning)',
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        <span style={{ fontFamily: 'var(--font-mono)' }}>{t('status.connecting')}</span>
      </div>
    )
  }

  const isSynced = info.synced
  const colorVar = isSynced ? 'success' : 'warning'

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
      style={{
        background: `var(--color-${colorVar}-bg)`,
        border: `0.5px solid var(--color-${colorVar}-border)`,
        color: `var(--color-${colorVar})`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      <span style={{ fontFamily: 'var(--font-mono)' }}>
        {isSynced ? t('status.synced') : t('status.syncing')}
        {' · '}
        {t('status.block')} {info.block_height.toLocaleString()}
        {info.last_block_age_seconds !== null && ` · ${timeAgo(info.last_block_age_seconds)}`}
        {!isSynced && ` · ${info.sync_pct}%`}
      </span>
    </div>
  )
}
