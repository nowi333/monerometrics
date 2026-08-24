import { useTranslation } from 'react-i18next'
import { api } from './api'
import TimeSeriesChart from './TimeSeriesChart'

function fmtLabel(ts, win) {
  const d = new Date(ts * 1000)
  if (win === '24h') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
function fmtFull(ts) {
  return new Date(ts * 1000).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const MIN_POINTS = 12

export default function SpreadChart() {
  const { t } = useTranslation()
  return (
    <TimeSeriesChart
      title={t('charts.spreadTitle')}
      infoText={t('info.spread')}
      color="#f59e0b"
      fill={false}
      windows={['24h', '7d', '30d', '90d']}
      defaultWindow="7d"
      fetcher={(w) => api.priceSpread(w)}
      mapPoints={(d, w) => {
        const pts = d.points.filter(p => p.ask_premium_pct != null)
        if (pts.length < MIN_POINTS) return []
        return pts.map(p => ({ y: p.ask_premium_pct, label: fmtLabel(p.timestamp_unix, w), full: fmtFull(p.timestamp_unix) }))
      }}
      format={(v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`}
      currentValue={(d) => d.current_ask_premium_pct}
      referenceY={{ value: 0, label: t('charts.parity') }}
      emptyText={t('charts.spreadCollecting')}
    />
  )
}
