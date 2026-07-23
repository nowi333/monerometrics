import { useTranslation } from 'react-i18next'
import { api } from './api'
import TimeSeriesChart from './TimeSeriesChart'

function fmtLabel(ts, win) {
  const d = new Date(ts * 1000)
  if (win === '1h' || win === '24h') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
function fmtFull(ts) {
  return new Date(ts * 1000).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function BlocktimeChart() {
  const { t } = useTranslation()
  return (
    <TimeSeriesChart
      title={t('charts.blocktimeTitle')}
      infoText={t('info.blocktime')}
      color="#3b82f6"
      fill={false}
      windows={['1h', '24h', '7d', '30d']}
      defaultWindow="24h"
      fetcher={(w) => api.networkBlocktime(w)}
      mapPoints={(d, w) => d.points.map(p => ({ y: p.delta_seconds, label: fmtLabel(p.timestamp_unix, w), full: fmtFull(p.timestamp_unix) }))}
      format={(v) => `${Math.round(v)}s`}
      currentValue={(d) => d.avg_delta}
      referenceY={{ value: 120, label: t('charts.target') }}
    />
  )
}
