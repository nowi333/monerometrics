import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from './api'

export default function KPICards() {
  const { t } = useTranslation()
  const [info, setInfo] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.info().then(setInfo).catch(e => setError(e.message))
    const interval = setInterval(() => {
      api.info().then(setInfo).catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  if (error) {
    return <div className="text-red-400 text-sm p-4">{t('state.apiError')} : {error}</div>
  }
  if (!info) {
    return <div className="text-[color:var(--color-dim)] text-sm p-4">{t('state.loading')}</div>
  }

  const cards = [
    { label: t('kpi.latestHeight'), value: info.latest_indexed_height ?? '-', color: 'text-[color:var(--color-accent)]' },
    { label: t('kpi.totalBlocks'), value: info.total_blocks_indexed.toLocaleString(), color: 'text-green-400' },
    { label: t('kpi.orphanBlocks'), value: info.total_orphan_blocks.toLocaleString(), color: 'text-orange-400' },
    { label: t('kpi.reorgsDetected'), value: info.total_reorgs_detected.toLocaleString(), color: 'text-purple-400' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {cards.map(c => (
        <div key={c.label} className="bg-[color:var(--color-card)] border border-[color:var(--color-border)] rounded-lg p-4">
          <div className="text-xs uppercase tracking-wide text-[color:var(--color-dim)] mb-2">{c.label}</div>
          <div className={`text-2xl font-mono font-medium ${c.color}`}>{c.value}</div>
        </div>
      ))}
    </div>
  )
}
