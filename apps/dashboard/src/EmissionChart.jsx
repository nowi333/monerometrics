import { useTranslation } from 'react-i18next'
import { api } from './api'
import TimeSeriesChart from './TimeSeriesChart'

function fmtLabel(bucket, win) {
  const d = new Date(bucket)
  if (win === '24h') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (win === '7d') return d.toLocaleDateString([], { weekday: 'short', hour: '2-digit' })
  if (win === '5y') return d.toLocaleDateString([], { month: 'short', year: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
function fmtFull(bucket) {
  return new Date(bucket).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function EmissionChart() {
  const { t } = useTranslation()
  return (
    <TimeSeriesChart
      title={t('charts.emissionTitle')}
      color="#22c55e"
      windows={['1h', '24h', '7d', '30d', '90d', '1y', '5y']}
      defaultWindow="30d"
      fetcher={(w) => api.networkEmission(w)}
      mapPoints={(d, w) => d.points.map(p => ({ y: Number(p.avg_reward_xmr), label: fmtLabel(p.bucket, w), full: fmtFull(p.bucket) }))}
      format={(v) => `${Number(v).toFixed(4)} XMR`}
    />
  )
}
