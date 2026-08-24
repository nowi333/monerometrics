import { useTranslation } from 'react-i18next'
import { makeDateFmt } from './chartDate'
import { api } from './api'
import TimeSeriesChart from './TimeSeriesChart'


export default function MempoolChart() {
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
      title={t('charts.mempoolTitle')}
      color="#06b6d4"
      windows={['1h', '24h', '7d', '30d', '90d', '1y', '5y']}
      defaultWindow="24h"
      fetcher={(w) => api.networkMempool(w)}
      mapPoints={(d, w) => d.points.map(p => ({ y: p.tx_count, label: fmtLabel(p.bucket, w), full: fmtFull(p.bucket) }))}
      format={(v) => `${Math.round(v)} ${t('kpi.txs')}`}
      currentValue={(d) => d.current}
    />
  )
}
