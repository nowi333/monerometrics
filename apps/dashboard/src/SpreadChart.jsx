import { useTranslation } from 'react-i18next'
import { makeDateFmt } from './chartDate'
import { api } from './api'
import TimeSeriesChart from './TimeSeriesChart'

const MIN_POINTS = 12
const HOUR = 3600

const ASK_BEST = '#f59e0b'
const ASK_AVG = '#8b5cf6'
const BID_BEST = '#38bdf8'
const BID_AVG = '#2563eb'

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

function Trait({ color, dashed }) {
  return (
    <svg width="16" height="8" aria-hidden="true" className="inline-block align-middle mr-1">
      <line x1="1" y1="4" x2="15" y2="4" stroke={color} strokeWidth="2" strokeLinecap="round"
        strokeDasharray={dashed ? '4 3' : undefined} />
    </svg>
  )
}
const pct = (v) => v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(2)}%`
const hasBid = (pts) => pts.some(p => p.bid_premium_pct != null)

export default function SpreadChart() {
  const { t, i18n } = useTranslation()
  const D = makeDateFmt(i18n.language)
  const fmtFull = (ts) => D.full(new Date(ts * 1000))
  return (
    <TimeSeriesChart
      title={t('charts.spreadTitle')}
      subtitle={t('charts.spreadSubtitle')}
      infoText={t('info.spread')}
      color={ASK_BEST}
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
        const series = [{
          label: t('charts.spreadAvgOffer'),
          color: ASK_AVG,
          dash: [5, 3],
          data: pts.map(p => p.ask_avg_premium_pct),
        }]
        if (hasBid(pts)) {
          series.push({
            label: t('charts.spreadBestBid'),
            color: BID_BEST,
            fill: false,
            data: pts.map(p => p.bid_premium_pct),
          })
          series.push({
            label: t('charts.spreadAvgBid'),
            color: BID_AVG,
            dash: [5, 3],
            fill: '-1',
            data: pts.map(p => p.bid_avg_premium_pct),
          })
        }
        return series
      }}
      format={(v) => pct(v)}
      currentValue={(d) => d.current_ask_premium_pct}
      headlineExtra={(d) => {
        const sep = <span className="mx-2 font-normal" style={{ color: 'var(--color-border-strong)' }}>/</span>
        return (
          <>
            {sep}<span style={{ color: ASK_AVG }}>{pct(d.current_ask_avg_premium_pct)}</span>
            {d.current_bid_premium_pct != null && <>{sep}<span style={{ color: BID_BEST }}>{pct(d.current_bid_premium_pct)}</span></>}
            {d.current_bid_avg_premium_pct != null && <>{sep}<span style={{ color: BID_AVG }}>{pct(d.current_bid_avg_premium_pct)}</span></>}
          </>
        )
      }}
      emptyText={t('charts.spreadCollecting')}
      footer={(d) => (
        <>
          <span>
            <Trait color={ASK_BEST} /> {t('charts.spreadBest')}{' '}
            <span style={{ color: 'var(--color-text-secondary)' }}>{pct(d.current_ask_premium_pct)}</span>
          </span>
          <span>
            <Trait color={ASK_AVG} dashed /> {t('charts.spreadAvgOffer')}{' '}
            <span style={{ color: 'var(--color-text-secondary)' }}>{pct(d.current_ask_avg_premium_pct)}</span>
          </span>
          {d.current_bid_premium_pct != null && (
            <span>
              <Trait color={BID_BEST} /> {t('charts.spreadBestBid')}{' '}
              <span style={{ color: 'var(--color-text-secondary)' }}>{pct(d.current_bid_premium_pct)}</span>
            </span>
          )}
          {d.current_bid_avg_premium_pct != null && (
            <span>
              <Trait color={BID_AVG} dashed /> {t('charts.spreadAvgBid')}{' '}
              <span style={{ color: 'var(--color-text-secondary)' }}>{pct(d.current_bid_avg_premium_pct)}</span>
            </span>
          )}
          {d.current_round_trip_pct != null && (
            <span>
              {t('charts.spreadRoundTrip')}{' '}
              <span style={{ color: 'var(--color-text-secondary)' }}>{pct(d.current_round_trip_pct)}</span>
            </span>
          )}
        </>
      )}
    />
  )
}
