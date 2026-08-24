import { useTranslation } from 'react-i18next'
import { api } from './api'
import TimeSeriesChart from './TimeSeriesChart'
import { makeDateFmt } from './chartDate'

const MIN_POINTS = 2

export default function FeeHistory() {
  const { t, i18n } = useTranslation()
  const D = makeDateFmt(i18n.language)
  const fmtLabel = (ts, win) => {
    const d = new Date(ts * 1000)
    if (win === '24h') return D.time(d)
    if (win === '7d') return D.dayMonthHour(d)
    return D.dayMonth(d)
  }
  const fmtFull = (ts) => D.full(new Date(ts * 1000))
  return (
    <TimeSeriesChart
      title={t('fees.historyTitle')}
      infoText={t('info.feesHistory')}
      color="#3b82f6"
      windows={['24h', '7d', '30d', '90d', '1y']}
      defaultWindow="30d"
      fetcher={(w) => api.networkFeesHistory(w)}
      mapPoints={(d, w) => {
        if (d.points.length < MIN_POINTS) return []
        return d.points.map(p => ({ y: p.normal_xmr * 1e9, label: fmtLabel(p.timestamp_unix, w), full: fmtFull(p.timestamp_unix) }))
      }}
      format={(v) => `${Math.round(v)} nXMR`}
      emptyText={t('fees.collecting')}
    />
  )
}
