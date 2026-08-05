import { useTranslation } from 'react-i18next'
import { api, formatHashrate } from './api'
import { useNetworkInfo } from './networkStore'
import { usePolledData } from './usePolledData'
import InfoTooltip from './InfoTooltip'
import TradingViewMini from './TradingViewMini'

function shortAge(s) {
  if (s == null) return '—'
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  return `${Math.floor(s / 3600)}h`
}

function shortDifficulty(d) {
  const n = Number(d)
  if (!n) return '—'
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)} T`
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} G`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} M`
  return String(n)
}

export default function KPICards() {
  const { t, i18n } = useTranslation()
  const { info: network, status: netStatus } = useNetworkInfo()
  const { data: price } = usePolledData(() => api.price(), d => !!(d && (d.official_usd || d.haveno_usd)), [], 30000)
  const { data: bt } = usePolledData(() => api.networkBlocktime('24h'), d => !!(d && d.median_delta != null), [], 60000)

  if (netStatus !== 'ok' || !network) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg p-4 border" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            <div className="mm-skeleton mb-3" style={{ height: 10, width: '60%' }} />
            <div className="mm-skeleton mb-2" style={{ height: 26, width: '80%' }} />
            <div className="mm-skeleton" style={{ height: 10, width: '45%' }} />
          </div>
        ))}
      </div>
    )
  }

  const usd = (n) => n != null ? `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'
  const havenoDetail = price?.haveno_usd != null
    ? `${t('kpi.havenoStreet')} ${usd(price.haveno_usd)}`
    : t('kpi.havenoUnavailable')

  const cards = [
    {
      label: t('kpi.blockHeight'),
      value: network.block_height.toLocaleString(),
      detail: network.synced ? t('status.synced') : `sync ${network.sync_pct}%`,
      detailColor: network.synced ? 'var(--color-success)' : 'var(--color-warning)',
      metaLabel: t('kpi.lastBlock'),
      metaValue: shortAge(network.last_block_age_seconds),
    },
    {
      label: t('kpi.networkHashrate'),
      value: formatHashrate(network.network_hashrate_h_s),
      detail: t('kpi.estimated'),
      detailColor: 'var(--color-dim)',
      metaLabel: t('kpi.difficulty'),
      metaValue: shortDifficulty(network.difficulty),
    },
    {
      label: t('kpi.mempool'),
      value: `${network.mempool_tx_count} ${t('kpi.txs')}`,
      detail: t('kpi.pending'),
      detailColor: 'var(--color-dim)',
      info: t('info.mempool'),
      metaLabel: t('kpi.blockTime'),
      metaValue: bt?.median_delta != null ? `${Math.round(bt.median_delta)}s` : '—',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {cards.map(c => (
        <div
          key={c.label}
          className="rounded-lg p-4 border flex flex-col"
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="text-xs mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-dim)' }}>
            <span className="uppercase tracking-wide">{c.label}</span>
            {c.info && <InfoTooltip text={c.info} />}
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-2xl font-medium" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>
              <span key={c.value} className="mm-flash inline-block">{c.value}</span>
            </div>
            <div className="text-xs mt-1" style={{ color: c.detailColor }}>{c.detail}</div>
          </div>
          <div className="mt-auto pt-3 flex items-center justify-between text-xs border-t" style={{ borderColor: 'var(--color-border)', color: 'var(--color-dim)' }}>
            <span className="uppercase tracking-wide">{c.metaLabel}</span>
            <span className="font-mono" style={{ color: 'var(--color-text-secondary)' }}>
              <span key={c.metaValue} className="mm-flash inline-block">{c.metaValue}</span>
            </span>
          </div>
        </div>
      ))}

      <div
        className="rounded-lg p-4 border flex flex-col"
        style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="text-xs mb-2 uppercase tracking-wide" style={{ color: 'var(--color-dim)' }}>
          {t('kpi.priceTitle')}
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <div className="w-full mx-auto" style={{ maxWidth: 260 }}>
            <TradingViewMini locale={i18n.language || 'en'} />
          </div>
        </div>
        <div className="mt-auto pt-3 flex items-center justify-between text-xs border-t" style={{ borderColor: 'var(--color-border)', color: 'var(--color-dim)' }}>
          <span className="uppercase tracking-wide">Haveno</span>
          <span className="font-mono" style={{ color: 'var(--color-text-secondary)' }}>
            <span key={havenoDetail} className="mm-flash inline-block">{price?.haveno_usd != null ? usd(price.haveno_usd) : '—'}</span>
          </span>
        </div>
      </div>
    </div>
  )
}
