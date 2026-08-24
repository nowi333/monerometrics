import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Line } from 'react-chartjs-2'
import {
  Chart, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler,
} from 'chart.js'
import zoomPlugin from 'chartjs-plugin-zoom'
import InfoTooltip from './InfoTooltip'
import PanelState from './PanelState'
import { usePolledData } from './usePolledData'

Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler, zoomPlugin)

const crosshair = {
  id: 'crosshair',
  afterDraw(chart) {
    try {
    if (!chart.chartArea || !chart.scales?.y) return
    const active = chart.tooltip && chart.tooltip.getActiveElements && chart.tooltip.getActiveElements()
    if (!active || !active.length) return
    const el = active[0].element
    if (!el) return
    const x = el.x
    const y = el.y
    const { ctx, chartArea } = chart
    ctx.save()
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(139,144,153,0.55)'
    ctx.setLineDash([4, 3])

    ctx.beginPath()
    ctx.moveTo(x, chartArea.top)
    ctx.lineTo(x, chartArea.bottom)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(chartArea.left, y)
    ctx.lineTo(chartArea.right, y)
    ctx.stroke()

    const fmt = chart.options?.plugins?.crosshair?.format
    if (fmt) {
      const label = fmt(chart.scales.y.getValueForPixel(y))
      ctx.setLineDash([])
      ctx.font = '10px ui-monospace, monospace'
      const padX = 4
      const w = ctx.measureText(label).width + padX * 2
      const bx = chartArea.right - w
      ctx.fillStyle = 'rgba(139,144,153,0.9)'
      ctx.fillRect(bx, y - 8, w, 16)
      ctx.fillStyle = '#0b0d12'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, bx + padX, y)
    }
    ctx.restore()
    } catch { }
  },
}

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

export default function TimeSeriesChart({
  title, infoText, color, windows, defaultWindow,
  fetcher, mapPoints, format, currentValue, fill = true, referenceY = null, yMax = null, emptyText = null,
  extraSeries = null, seriesLabel = null, footer = null, bandFill = false,
}) {
  const { t } = useTranslation()
  const [window, setWindow] = useState(defaultWindow)
  const [switching, setSwitching] = useState(false)
  const [isFs, setIsFs] = useState(false)
  const boxRef = useRef(null)
  const chartRef = useRef(null)
  const readoutRef = useRef(null)
  const timeRef = useRef(null)

  const { data, status } = usePolledData(
    () => fetcher(window),
    d => d && mapPoints(d, window).length > 0,
    [window],
  )

  useEffect(() => {
    const id = requestAnimationFrame(() => setSwitching(false))
    return () => cancelAnimationFrame(id)
  }, [data, status])
  useEffect(() => {
    const onFs = () => setIsFs(document.fullscreenElement === boxRef.current)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])
  const changeWindow = (w) => {
    if (w === window) return
    setSwitching(true)
    setWindow(w)
    setTimeout(() => setSwitching(false), 8000)
  }

  const toggleFs = () => {
    if (!boxRef.current) return
    if (!document.fullscreenElement) boxRef.current.requestFullscreen?.()
    else document.exitFullscreen?.()
  }
  const resetZoom = () => chartRef.current?.resetZoom?.()


  const zoomIn = () => chartRef.current?.zoom?.(1.3)
  const zoomOut = () => chartRef.current?.zoom?.(0.77)

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
        <button onClick={zoomOut} className="p-1.5 rounded border" title={t('charts.zoomOut')}
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="8" y1="11" x2="14" y2="11"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </button>
        <button onClick={zoomIn} className="p-1.5 rounded border" title={t('charts.zoomIn')}
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </button>
        <button onClick={resetZoom} className="p-1.5 rounded border" title={t('charts.resetZoom')}
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        </button>
        <select value={window} onChange={e => changeWindow(e.target.value)} disabled={switching}
          className="bg-transparent border rounded px-3 py-1.5 text-sm cursor-pointer disabled:opacity-50 disabled:cursor-wait"
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
    return wrap(<PanelState status={status} variant="chart" height={240} emptyText={emptyText} />)
  }

  const datasets = [{
    label: seriesLabel || title,
    data: ys,
    borderColor: color,
    backgroundColor: rgba(color, 0.12),
    borderWidth: 1.8,
    pointRadius: 0,
    pointHoverRadius: 4,
    fill,


    tension: 0,
  }]
  if (referenceY) {
    datasets.push({
      label: referenceY.label,
      data: points.map(() => referenceY.value),
      borderColor: 'rgba(34,197,94,0.9)',
      borderWidth: 2,
      borderDash: [6, 4],
      pointRadius: 0,
      fill: false,
    })
  }

  if (extraSeries) {
    for (const serie of extraSeries(data, window)) {
      datasets.push({
        label: serie.label,
        data: serie.data,
        borderColor: serie.color,
        backgroundColor: rgba(serie.color, 0.10),
        borderWidth: 1.6,
        borderDash: serie.dash || undefined,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: bandFill ? '-1' : false,
        tension: 0,
      })
    }
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
      legend: { display: !!referenceY || !!extraSeries, labels: { color: '#8b9099', font: { size: 11 }, boxWidth: 12 } },

      crosshair: { format },
      tooltip: {
        callbacks: {
          title: (items) => items.length ? (points[items[0].dataIndex]?.full ?? '') : '',
          label: (ctx) => `${ctx.dataset.label}: ${format(ctx.parsed.y)}`,
        },
      },
      zoom: {


        pan: { enabled: true, mode: 'x' },
        zoom: {



          wheel: { enabled: false },
          pinch: { enabled: true },
          drag: { enabled: false },
          mode: 'x',
        },
      },
    },
    scales: {
      x: { ticks: { color: '#8b9099', font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }, grid: { display: false } },
      y: { max: yMax ?? undefined, ticks: { color: '#8b9099', font: { size: 10 }, callback: (v) => format(v) }, grid: { color: 'rgba(255,255,255,0.05)' } },
    },
  }

  return wrap(
    <>
      <div onMouseLeave={restoreReadout} className="relative" style={{ height: isFs ? '80vh' : '240px' }}>
        <Line key={window} ref={chartRef} data={chartData} options={options} plugins={[crosshair]} />
        {switching && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--color-card) 55%, transparent)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-6.219-8.56">
                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.7s" repeatCount="indefinite" />
              </path>
            </svg>
          </div>
        )}
      </div>
      {footer ? (
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs font-mono" style={{ color: 'var(--color-dim)' }}>
          {footer(data)}
        </div>
      ) : stats && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs font-mono" style={{ color: 'var(--color-dim)' }}>
          <span>{t('charts.min')} <span style={{ color: 'var(--color-text-secondary)' }}>{format(stats.min)}</span></span>
          <span>{t('charts.avg')} <span style={{ color: 'var(--color-text-secondary)' }}>{format(stats.avg)}</span></span>
          <span>{t('charts.max')} <span style={{ color: 'var(--color-text-secondary)' }}>{format(stats.max)}</span></span>
        </div>
      )}
    </>
  )
}
