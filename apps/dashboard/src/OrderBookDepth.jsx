import { useTranslation } from 'react-i18next'
import { Line } from 'react-chartjs-2'
import { Chart, LineElement, PointElement, LinearScale, Tooltip, Filler } from 'chart.js'
import { api } from './api'
import InfoTooltip from './InfoTooltip'
import PanelState from './PanelState'
import { usePolledData } from './usePolledData'

Chart.register(LineElement, PointElement, LinearScale, Tooltip, Filler)

const BID = '#38bdf8'
const ASK = '#f59e0b'
const pct = (v) => v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(2)}%`
const xmr = (v) => v == null ? '—' : `${v.toFixed(2)} XMR`

const spotLine = {
  id: 'spotLine',
  afterDatasetsDraw(chart) {
    const { ctx, chartArea, scales } = chart
    if (!chartArea || !scales?.x) return
    const x = scales.x.getPixelForValue(0)
    if (x < chartArea.left || x > chartArea.right) return
    ctx.save()
    ctx.strokeStyle = 'rgba(139,144,153,0.7)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 3])
    ctx.beginPath()
    ctx.moveTo(x, chartArea.top)
    ctx.lineTo(x, chartArea.bottom)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(139,144,153,0.9)'
    ctx.font = '10px ui-monospace, monospace'
    ctx.textAlign = 'center'
    ctx.fillText('spot', x, chartArea.top + 10)
    ctx.restore()
  },
}
Chart.register(spotLine)

export default function OrderBookDepth() {
  const { t } = useTranslation()
  const { data, status } = usePolledData(
    () => api.havenoBook(),
    d => d && ((d.asks && d.asks.length) || (d.bids && d.bids.length)),
    [],
    60000,
  )

  const wrap = (inner) => (
    <div className="rounded-lg border p-4 sm:p-6" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
      <div className="flex justify-between items-start mb-4 gap-3">
        <div>
          <h3 className="text-base font-medium flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            {t('haveno.book.title')}<InfoTooltip text={t('info.havenoBook')} />
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--color-dim)' }}>{t('haveno.book.lead')}</p>
        </div>
      </div>
      {inner}
    </div>
  )

  if (status !== 'ok') return wrap(<PanelState status={status} height={240} emptyText={t('haveno.book.empty')} />)

  const toXY = (levels) => levels
    .filter(l => l.premium_pct != null)
    .map(l => ({ x: l.premium_pct, y: l.cumulative }))
  const bids = toXY(data.bids).sort((a, b) => a.x - b.x)
  const asks = toXY(data.asks).sort((a, b) => a.x - b.x)

  const chartData = {
    datasets: [
      {
        label: t('haveno.book.bids'),
        data: bids,
        borderColor: BID,
        backgroundColor: 'rgba(56,189,248,0.14)',
        borderWidth: 1.8,
        stepped: 'before',
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: 'origin',
      },
      {
        label: t('haveno.book.asks'),
        data: asks,
        borderColor: ASK,
        backgroundColor: 'rgba(245,158,11,0.14)',
        borderWidth: 1.8,
        stepped: 'after',
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: 'origin',
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: 'nearest', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => pct(items[0].parsed.x),
          label: (item) => `${item.dataset.label} · ${xmr(item.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        type: 'linear',
        title: { display: true, text: t('haveno.book.axisX'), color: '#8b9099', font: { size: 10 } },
        ticks: { color: '#8b9099', font: { size: 10 }, callback: (v) => `${v > 0 ? '+' : ''}${v}%` },
        grid: { color: 'rgba(139,144,153,0.10)' },
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: t('haveno.book.axisY'), color: '#8b9099', font: { size: 10 } },
        ticks: { color: '#8b9099', font: { size: 10 } },
        grid: { color: 'rgba(139,144,153,0.10)' },
      },
    },
  }

  const stat = (label, value, color) => (
    <div>
      <div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-dim)' }}>{label}</div>
      <div className="text-sm font-mono mt-0.5" style={{ color: color || 'var(--color-text)' }}>{value}</div>
    </div>
  )

  return wrap(
    <>
      <div className="h-56 sm:h-64">
        <Line data={chartData} options={options} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
        {stat(t('haveno.book.sellSide'), `${xmr(data.bid_amount)} · ${data.bid_offers}`, BID)}
        {stat(t('haveno.book.buySide'), `${xmr(data.ask_amount)} · ${data.ask_offers}`, ASK)}
        {stat(t('haveno.book.avgBid'), pct(data.bid_avg_premium_pct), BID)}
        {stat(t('haveno.book.avgAsk'), pct(data.ask_avg_premium_pct), ASK)}
      </div>
      {data.round_trip_cost_pct != null && (
        <p className="text-xs mt-3" style={{ color: 'var(--color-dim)' }}>
          {t('haveno.book.roundTrip', { pct: pct(data.round_trip_cost_pct) })}
        </p>
      )}
    </>
  )
}
