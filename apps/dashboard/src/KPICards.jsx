import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api, formatHashrate } from './api'
import InfoTooltip from './InfoTooltip'

/**
 * 4 KPI cards alignees sur le mockup.
 * Resilient : si /network/info echoue (503 RPC timeout), on retry
 * sans crasher l'UI. Affiche valeurs partielles si possible.
 */
export default function KPICards() {
  const { t } = useTranslation()
  const [network, setNetwork] = useState(null)
  const [reorgsStats, setReorgsStats] = useState(null)

  useEffect(() => {
    const fetchAll = async () => {
      // Network info : peut echouer (503 RPC) -> on garde l'ancienne valeur
      try {
        const n = await api.networkInfo()
        setNetwork(n)
      } catch (e) {
        console.warn('networkInfo failed, keeping previous value:', e.message)
      }
      // Reorgs stats : appel DB-only, devrait toujours marcher
      try {
        const r = await api.reorgsStats()
        setReorgsStats(r)
      } catch (e) {
        console.warn('reorgsStats failed:', e.message)
      }
    }
    fetchAll()
    const interval = setInterval(fetchAll, 30000)
    return () => clearInterval(interval)
  }, [])

  if (!network) {
    return (
      <div className="text-sm p-4" style={{ color: 'var(--color-dim)' }}>
        {t('state.loading')}
      </div>
    )
  }

  const reorgs24h = reorgsStats?.windows.find(w => w.window === '24h')
  const reorgCount = reorgs24h?.count ?? 0
  const lastDepth = reorgs24h?.max_depth

  const cards = [
    {
      label: t('kpi.blockHeight'),
      value: network.block_height.toLocaleString(),
      detail: network.synced ? t('status.synced') : `sync ${network.sync_pct}%`,
      detailColor: network.synced ? 'var(--color-success)' : 'var(--color-warning)',
    },
    {
      label: t('kpi.networkHashrate'),
      value: formatHashrate(network.network_hashrate_h_s),
      detail: t('kpi.targetBlocktime'),
      detailColor: 'var(--color-dim)',
    },
    {
      label: t('kpi.mempool'),
      value: `${network.mempool_tx_count} ${t('kpi.txs')}`,
      detail: t('kpi.pending'),
      detailColor: 'var(--color-dim)',
      info: t('info.mempool'),
    },
    {
      label: t('kpi.reorgWatcher'),
      value: `${reorgCount} ${t('kpi.events')} · 24h`,
      detail: lastDepth ? `${t('kpi.maxDepth')} ${lastDepth}` : t('kpi.noReorg'),
      detailColor: reorgCount > 0 ? 'var(--color-warning)' : 'var(--color-dim)',
      accent: reorgCount > 0,
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {cards.map(c => (
        <div
          key={c.label}
          className="rounded-lg p-4 border"
          style={{
            background: 'var(--color-card)',
            borderColor: 'var(--color-border)',
            borderLeftWidth: c.accent ? '2px' : '0.5px',
            borderLeftColor: c.accent ? 'var(--color-warning)' : 'var(--color-border)',
          }}
        >
          <div
            className="text-xs mb-2 flex items-center gap-1.5"
            style={{ color: c.accent ? 'var(--color-warning)' : 'var(--color-dim)' }}
          >
            <span className="uppercase tracking-wide">{c.label}</span>
            {c.info && <InfoTooltip text={c.info} />}
          </div>
          <div
            className="text-xl font-medium mb-1"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}
          >
            {c.value}
          </div>
          <div className="text-xs" style={{ color: c.detailColor }}>
            {c.detail}
          </div>
        </div>
      ))}
    </div>
  )
}
