import { useTranslation } from 'react-i18next'
import { makeDateFmt } from './chartDate'
import { api } from './api'
import TimeSeriesChart from './TimeSeriesChart'
import ContextStrip from './ContextStrip'


export default function HavenoLiquidity() {
  const { t, i18n } = useTranslation()
  const D = makeDateFmt(i18n.language)
  const fmtLabel = (ts, win) => {
    const d = new Date(ts * 1000)
    if (win === '24h' || win === '7d') return D.dayMonthHour(d)
    return D.dayMonthYear(d)
  }
  const fmtFull = (ts) => D.full(new Date(ts * 1000))
  return (
    <TimeSeriesChart
      title={t('charts.havenoLiquidityTitle')}
      infoText={t('info.havenoLiquidity')}
      color="#22d3ee"
      windows={['7d', '30d', '90d', '1y', 'all']}
      defaultWindow="90d"
      fetcher={(w) => api.havenoLiquidity(w)}
      mapPoints={(d, w) => d.points
        .filter(p => p.max_liquidity != null)
        .map(p => ({ y: p.max_liquidity, label: fmtLabel(p.timestamp_unix, w), full: fmtFull(p.timestamp_unix) }))}
      format={(v) => `${Math.round(v)} XMR`}
      currentValue={(d) => d.current_liquidity}
      context={(d) => <ContextStrip stats={d.stats} format={(v) => `${Math.round(v)} XMR`} />}
    />
  )
}
