import { useTranslation } from 'react-i18next'
import { makeDateFmt } from './chartDate'
import { api } from './api'
import TimeSeriesChart from './TimeSeriesChart'


export default function BlocktimeChart() {
  const { t, i18n } = useTranslation()
  const D = makeDateFmt(i18n.language)
  const fmtLabel = (ts, win) => {
    const d = new Date(ts * 1000)
    if (win === '1h' || win === '24h') return D.time(d)
    return D.dayMonth(d)
  }
  const fmtFull = (ts) => D.full(new Date(ts * 1000))
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
      yMax={1200}
    />
  )
}
