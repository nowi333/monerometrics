import { useTranslation } from 'react-i18next'
import { makeDateFmt } from './chartDate'
import { api, formatHashrate } from './api'
import TimeSeriesChart from './TimeSeriesChart'


export default function HashrateChart() {
  const { t, i18n } = useTranslation()
  const D = makeDateFmt(i18n.language)
  const fmtLabel = (bucket, win) => {
    const d = new Date(bucket)
    if (win === '1h' || win === '24h') return D.time(d)
    if (win === '7d') return D.dayHour(d)
    if (win === '5y') return D.monthYear(d)
    return D.dayMonth(d)
  }
  const fmtFull = (bucket) => D.full(new Date(bucket))
  return (
    <TimeSeriesChart
      title={t('charts.hashrateTitle')}
      color="#ff6600"
      windows={['1h', '24h', '7d', '30d', '90d', '1y', '5y']}
      defaultWindow="30d"
      fetcher={(w) => api.networkHashrate(w)}
      mapPoints={(d, w) => d.points.map(p => ({ y: p.hashrate_h_s, label: fmtLabel(p.bucket, w), full: fmtFull(p.bucket) }))}
      format={formatHashrate}
    />
  )
}
