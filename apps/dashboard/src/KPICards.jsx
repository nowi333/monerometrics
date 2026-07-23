import { useTranslation } from 'react-i18next'
import { api, formatHashrate } from './api'
import { useNetworkInfo } from './NetworkContext'
import { usePolledData } from './usePolledData'
import InfoTooltip from './InfoTooltip'

export default function KPICards() {
  const { t } = useTranslation()
  const { info: network, status: netStatus } = useNetworkInfo()
  const { data: reorgsStats } = usePolledData(() => api.reorgsStats(), d => !!(d && d.windows), [])

  if (netStatus !== 'ok' || !network) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg p-4 border" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            <div className="mm-skeleton mb-3" style={{ height: 10, width: '60%' }} />
            <div className="mm-skeleton mb-2" style={{ height: 22, width: '80%' }} />
            <div className="mm-skeleton" style={{ height: 10, width: '45%' }} />
          </div>
        ))}
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
      detail: t('kpi.estimated'),
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
            borderLeftWidth: c.accent ? '2px' : '1px',
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
            {}
            <span key={c.value} className="mm-flash inline-block">{c.value}</span>
          </div>
          <div className="text-xs" style={{ color: c.detailColor }}>
            {c.detail}
          </div>
        </div>
      ))}
    </div>
  )
}
