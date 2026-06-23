import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Line } from 'react-chartjs-2'
import {
  Chart, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler,
} from 'chart.js'
import zoomPlugin from 'chartjs-plugin-zoom'
import InfoTooltip from './InfoTooltip'
import { usePolledData } from './usePolledData'

Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler, zoomPlugin)

// Crosshair : ligne verticale pointillee a la position survolee (style TradingView).
const crosshair = {
  id: 'crosshair',
  afterDraw(chart) {
    const active = chart.tooltip && chart.tooltip.getActiveElements && chart.tooltip.getActiveElements()
    if (!active || !active.length) return
    const x = active[0].element.x
    const { ctx, chartArea } = chart
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x, chartArea.top)
    ctx.lineTo(x, chartArea.bottom)
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(139,144,153,0.55)'
    ctx.setLineDash([4, 3])
    ctx.stroke()
    ctx.restore()
  },
}

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

/**
 * Graphe temporel reutilisable, "TradingView-lite" :
 * zoom molette + pan (glisser), crosshair, stats min/max/moy, reset zoom,
 * tooltip precis, ligne de reference optionnelle. Donnees en live (usePolledData).
 *
 * Props :
 *  - title, infoText, color
 *  - windows[], defaultWindow
 *  - fetcher(window) -> data
 *  - mapPoints(data, window) -> [{ y, label, full }]
 *  - format(v) -> string (tooltip / axe / valeurs)
 *  - currentValue(data, ys)? -> nombre affiche en gros (defaut: dernier y)
 *  - fill? (defaut true), referenceY? { value, label }
 */
export default function TimeSeriesChart({
  title, infoText, color, windows, defaultWindow,
  fetcher, mapPoints, format, currentValue, fill = true, referenceY = null,
}) {
  const { t } = useTranslation()
  const [window, setWindow] = useState(defaultWindow)
  const boxRef = useRef(null)
  const chartRef = useRef(null)
  const readoutRef = useRef(null)
  const timeRef = useRef(null)

  const { data, status } = usePolledData(
    () => fetcher(window),
    d => d && mapPoints(d, window).length > 0,
    [window],
  )

  const toggleFs = () => {
    if (!boxRef.current) return
    if (!document.fullscreenElement) boxRef.current.requestFullscreen?.()
    else document.exitFullscreen?.()
  }
  const resetZoom = () => chartRef.current?.resetZoom?.()

  const points = status === 'ok' ? mapPoints(data, window) : []
  const ys = points.map(p => p.y)
  const stats = ys.length
    ? { min: Math.min(...ys), max: Math.max(...ys), avg: ys.reduce((a, b) => a + b, 0) / ys.length }
    : null
  const current = ys.length ? (currentValue ? currentValue(data, ys) : ys[ys.length - 1]) : null

  const header = (
    <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
      <div>
        <h3 className="text-base font-medium flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          {title}{infoText ? <InfoTooltip text={infoText} /> : null}
        </h3>
        {status === 'ok' && current != null && (
          <p className="text-2xl font-medium mt-1" style={{ color }}>
            <span ref={readoutRef}>{format(current)}</span>
            <span ref={timeRef} className="text-xs ml-2 font-normal align-middle" style={{ color: 'var(--color-dim)' }} />
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={resetZoom} className="p-1.5 rounded border" title={t('charts.resetZoom')}
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        </button>
        <select value={window} onChange={e => setWindow(e.target.value)}
          className="bg-transparent border rounded px-3 py-1 text-sm"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
          {windows.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
        <button onClick={toggleFs} className="p-1.5 rounded border" title={t('charts.fullscreen')}
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
        </button>
      </div>
    </div>
  )

  const wrap = (inner) => (
    <div ref={boxRef} className="rounded-lg border p-5 sm:p-6 flex flex-col" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
      {header}
      <div className="flex-1">{inner}</div>
    </div>
  )

  if (status !== 'ok') {
    return wrap(<div className="text-sm py-12 text-center" style={{ color: status === 'error' ? 'var(--color-warn)' : 'var(--color-dim)' }}>
      {status === 'error' ? t('state.apiError') : status === 'empty' ? t('state.waitingSync') : t('state.loading')}
    </div>)
  }

  const datasets = [{
    label: title,
    data: ys,
    borderColor: color,
    backgroundColor: rgba(color, 0.12),
    borderWidth: 1.8,
    pointRadius: 0,
    pointHoverRadius: 4,
    fill,
    tension: 0.25,
  }]
  if (referenceY) {
    datasets.push({
      label: referenceY.label,
      data: points.map(() => referenceY.value),
      borderColor: 'rgba(34,197,94,0.5)',
      borderWidth: 1.5,
      borderDash: [5, 4],
      pointRadius: 0,
      fill: false,
    })
  }

  const chartData = { labels: points.map(p => p.label), datasets }

  const restoreReadout = () => {
    if (readoutRef.current) readoutRef.current.textContent = format(current)
    if (timeRef.current) timeRef.current.textContent = ''
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: 'index', intersect: false },
    // Readout au survol : met a jour l'en-tete avec le point pointe, sans
    // re-render React (donc sans reinitialiser le zoom).
    onHover: (evt, elements) => {
      if (!readoutRef.current) return
      const p = elements && elements.length ? points[elements[0].index] : null
      if (p) {
        readoutRef.current.textContent = format(p.y)
        if (timeRef.current) timeRef.current.textContent = p.full
      } else {
        restoreReadout()
      }
    },
    plugins: {
      legend: { display: !!referenceY, labels: { color: '#8b9099', font: { size: 11 }, boxWidth: 12 } },
      tooltip: {
        callbacks: {
          title: (items) => items.length ? (points[items[0].dataIndex]?.full ?? '') : '',
          label: (ctx) => `${ctx.dataset.label}: ${format(ctx.parsed.y)}`,
        },
      },
      zoom: {
        pan: { enabled: true, mode: 'x' },
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          drag: { enabled: false },
          mode: 'x',
        },
      },
    },
    scales: {
      x: { ticks: { color: '#8b9099', font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }, grid: { display: false } },
      y: { ticks: { color: '#8b9099', font: { size: 10 }, callback: (v) => format(v) }, grid: { color: 'rgba(255,255,255,0.05)' } },
    },
  }

  return wrap(
    <>
      <div onMouseLeave={restoreReadout} style={{ height: document.fullscreenElement ? '80vh' : '240px' }}>
        <Line ref={chartRef} data={chartData} options={options} plugins={[crosshair]} />
      </div>
      {stats && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs font-mono" style={{ color: 'var(--color-dim)' }}>
          <span>{t('charts.min')} <span style={{ color: 'var(--color-text-secondary)' }}>{format(stats.min)}</span></span>
          <span>{t('charts.avg')} <span style={{ color: 'var(--color-text-secondary)' }}>{format(stats.avg)}</span></span>
          <span>{t('charts.max')} <span style={{ color: 'var(--color-text-secondary)' }}>{format(stats.max)}</span></span>
          <span className="ml-auto opacity-70">{t('charts.zoomHint')}</span>
        </div>
      )}
    </>
  )
}
