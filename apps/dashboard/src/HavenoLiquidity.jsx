import { useTranslation } from 'react-i18next'
import { api } from './api'
import TimeSeriesChart from './TimeSeriesChart'

function fmtLabel(ts, win) {
  const d = new Date(ts * 1000)
  if (win === '24h' || win === '7d') return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit' })
  return d.toLocaleDateString([], { year: '2-digit', month: 'short', day: 'numeric' })
}
function fmtFull(ts) {
  return new Date(ts * 1000).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function HavenoLiquidity() {
  const { t } = useTranslation()
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
    />
  )
}
