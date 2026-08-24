import { useTranslation } from 'react-i18next'
import { makeDateFmt } from './chartDate'
import { api } from './api'
import TimeSeriesChart from './TimeSeriesChart'

const MIN_POINTS = 12
const HOUR = 3600

function makeLabeller(points, D) {
  const span = points.length > 1 ? points[points.length - 1].timestamp_unix - points[0].timestamp_unix : 0
  return (ts) => {
    const d = new Date(ts * 1000)
    if (span <= 36 * HOUR) return D.time(d)
    if (span <= 30 * 24 * HOUR) return D.dayMonthHour(d)
    return D.dayMonthYear(d)
  }
}
const usable = (d) => d.points.filter(p => p.ask_premium_pct != null)
const pct = (v) => v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(2)}%`

export default function SpreadChart() {
  const { t, i18n } = useTranslation()
  const D = makeDateFmt(i18n.language)
  const fmtFull = (ts) => D.full(new Date(ts * 1000))
  return (
    <TimeSeriesChart
      title={t('charts.spreadTitle')}
      infoText={t('info.spread')}
      color="#f59e0b"
      seriesLabel={t('charts.spreadBest')}
      fill={false}
      bandFill
      windows={['24h', '7d', '30d', '90d']}
      defaultWindow="7d"
      fetcher={(w) => api.priceSpread(w)}
      mapPoints={(d) => {
        const pts = usable(d)
        if (pts.length < MIN_POINTS) return []
        const label = makeLabeller(pts, D)
        return pts.map(p => ({ y: p.ask_premium_pct, label: label(p.timestamp_unix), full: fmtFull(p.timestamp_unix) }))
      }}
      extraSeries={(d) => {
        const pts = usable(d)
        if (pts.length < MIN_POINTS) return []
        return [{
          label: t('charts.spreadAvgOffer'),
          color: '#8b5cf6',
          dash: [5, 3],
          data: pts.map(p => p.ask_avg_premium_pct),
        }]
      }}
      format={(v) => pct(v)}
      currentValue={(d) => d.current_ask_premium_pct}
      headlineExtra={(d) => (
        <>
          <span className="mx-2 font-normal" style={{ color: 'var(--color-border-strong)' }}>/</span>
          <span style={{ color: '#8b5cf6' }}>{pct(d.current_ask_avg_premium_pct)}</span>
        </>
      )}
      emptyText={t('charts.spreadCollecting')}
      footer={(d) => (
        <>
          <span>
            <span style={{ color: '#f59e0b' }}>■</span> {t('charts.spreadBest')}{' '}
            <span style={{ color: 'var(--color-text-secondary)' }}>{pct(d.current_ask_premium_pct)}</span>
          </span>
          <span>
            <span style={{ color: '#8b5cf6' }}>▨</span> {t('charts.spreadAvgOffer')}{' '}
            <span style={{ color: 'var(--color-text-secondary)' }}>{pct(d.current_ask_avg_premium_pct)}</span>
          </span>
          <span>
            {t('charts.spreadDepthCost')}{' '}
            <span style={{ color: 'var(--color-text-secondary)' }}>
              {d.current_ask_premium_pct != null && d.current_ask_avg_premium_pct != null
                ? pct(d.current_ask_avg_premium_pct - d.current_ask_premium_pct)
                : '—'}
            </span>
          </span>
          <span>
            {t('charts.spreadLiquidity')}{' '}
            <span style={{ color: 'var(--color-text-secondary)' }}>
              {d.current_ask_amount != null ? `${Math.round(d.current_ask_amount)} XMR` : '—'}
              {d.current_ask_offers != null ? ` · ${d.current_ask_offers}` : ''}
            </span>
          </span>
        </>
      )}
    />
  )
}
