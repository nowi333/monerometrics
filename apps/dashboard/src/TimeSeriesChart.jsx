import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { tooltipPlugin } from './chartTooltip'
import { useThemeColors } from './chartTheme'
import { crosshair, lastValueTag } from './chartTools'
import ChartNavigator from './ChartNavigator'
import { Line } from 'react-chartjs-2'
import {
  Chart, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler,
} from 'chart.js'
import InfoTooltip from './InfoTooltip'
import PanelState from './PanelState'
import ApiCall from './ApiCall'
import { usePolledData } from './usePolledData'

Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler)

// En deca de ce nombre de points visibles, zoomer n'apporte plus rien.
const MIN_POINTS = 5


function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

function Btn({ onClick, title, active, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active === undefined ? undefined : active}
      className="p-1.5 rounded border transition-colors"
      style={{
        borderColor: active ? 'color-mix(in srgb, var(--color-accent) 55%, var(--color-border))' : 'var(--color-border)',
        color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        background: active ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : 'transparent',
      }}
    >{children}</button>
  )
}

/**
 * Graphique de serie temporelle, avec la plage visible pour objet central.
 *
 * La plage est tenue ici, en fraction de la serie, et les points sont decoupes
 * avant d'etre remis a Chart.js. Tout ce que la carte affiche, statistiques,
 * variation, reticule, porte donc sur ce qu'on voit et non sur l'ensemble des
 * donnees : c'est la difference entre un graphique qu'on regarde et un
 * graphique qu'on interroge.
 *
 * Les gestes suivent cette meme idee. La molette ne zoome qu'avec une touche
 * de commande ou en plein ecran, sinon la page ne pourrait plus defiler des
 * qu'on survole une carte.
 */
export default function TimeSeriesChart({
  title, infoText, color, windows, defaultWindow,
  fetcher, mapPoints, format, currentValue, fill = true, referenceY = null, yMax = null, emptyText = null,
  extraSeries = null, seriesLabel = null, footer = null, bandFill = false, headlineExtra = null, subtitle = null, showLegend = null,
  headlineClass = 'text-2xl', context = null, apiPath = null, ranger = true,
}) {
  const { t } = useTranslation()
  const [window_, setWindow] = useState(defaultWindow)
  const [switching, setSwitching] = useState(false)
  const [isFs, setIsFs] = useState(false)
  const [range, setRange] = useState([0, 1])
  const boxRef = useRef(null)
  const plotRef = useRef(null)
  const chartRef = useRef(null)
  const readoutRef = useRef(null)
  const switchTimer = useRef(null)
  const theme = useThemeColors()

  useEffect(() => () => clearTimeout(switchTimer.current), [])

  const { data, status } = usePolledData(
    () => fetcher(window_),
    d => d && mapPoints(d, window_).length > 0,
    [window_],
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
    if (w === window_) return
    setSwitching(true)
    setWindow(w)
    // Une plage gardee d'une fenetre a l'autre designerait des dates sans rapport.
    setRange([0, 1])
    // Filet de securite si la reponse n'arrive jamais ; annule a chaque
    // nouveau changement et au demontage.
    clearTimeout(switchTimer.current)
    switchTimer.current = setTimeout(() => setSwitching(false), 8000)
  }

  const clamp = useCallback(([lo, hi], n) => {
    const minW = n > MIN_POINTS ? MIN_POINTS / n : 1
    let w = Math.max(minW, Math.min(1, hi - lo))
    let a = Math.max(0, Math.min(1 - w, lo))
    return [a, a + w]
  }, [])

  const points = status === 'ok' ? mapPoints(data, window_) : []
  const n = points.length
  const [lo, hi] = range
  const i0 = Math.max(0, Math.floor(lo * (n - 1)))
  const i1 = Math.min(n - 1, Math.ceil(hi * (n - 1)))
  const visible = n ? points.slice(i0, i1 + 1) : []
  const zoomed = i1 - i0 + 1 < n

  const applyRange = useCallback((r) => setRange(clamp(r, n || 1)), [clamp, n])

  // Zoom centre sur un point d'ancrage, exprime en fraction de la largeur.
  const zoomAt = useCallback((factor, anchor = 0.5) => {
    setRange(([a, b]) => {
      const c = a + (b - a) * anchor
      const w = (b - a) / factor
      return clamp([c - w * anchor, c + w * (1 - anchor)], n || 1)
    })
  }, [clamp, n])

  const pan = useCallback((delta) => {
    setRange(([a, b]) => clamp([a + delta * (b - a), b + delta * (b - a)], n || 1))
  }, [clamp, n])

  const reset = () => setRange([0, 1])

  // React pose ses ecouteurs de molette en mode passif, ou `preventDefault` est
  // refuse : il faut donc l'attacher soi-meme pour pouvoir retenir le
  // defilement pendant un zoom.
  useEffect(() => {
    const el = plotRef.current
    if (!el) return
    const onWheel = (e) => {
      // Sans cette condition, survoler une carte bloquerait le defilement de la page.
      if (!e.ctrlKey && !e.metaKey && !isFs) return
      e.preventDefault()
      const box = el.getBoundingClientRect()
      const anchor = Math.max(0, Math.min(1, (e.clientX - box.left) / box.width))
      zoomAt(e.deltaY < 0 ? 1.22 : 1 / 1.22, anchor)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [isFs, zoomAt, status])

  // Glisser deplace la fenetre. Choisir une plage se fait sur la bande de
  // navigation, ou l'on voit ce qu'on selectionne.
  const onPointerDown = (e) => {
    if (e.pointerType === 'touch' || !plotRef.current) return
    const box = plotRef.current.getBoundingClientRect()
    const from = (e.clientX - box.left) / box.width
    const base = range
    const move = (ev) => {
      const d = (ev.clientX - box.left) / box.width - from
      applyRange([base[0] - d * (base[1] - base[0]), base[1] - d * (base[1] - base[0])])
    }
    const up = () => {
      globalThis.removeEventListener('pointermove', move)
      globalThis.removeEventListener('pointerup', up)
    }
    globalThis.addEventListener('pointermove', move)
    globalThis.addEventListener('pointerup', up)
  }

  const onKeyDown = (e) => {
    const k = e.key
    if (k === 'ArrowLeft') { e.preventDefault(); pan(-0.15) }
    else if (k === 'ArrowRight') { e.preventDefault(); pan(0.15) }
    else if (k === '+' || k === '=') { e.preventDefault(); zoomAt(1.3) }
    else if (k === '-') { e.preventDefault(); zoomAt(1 / 1.3) }
    else if (k === '0' || k.toLowerCase() === 'r') { e.preventDefault(); reset() }
  }

  const ys = visible.map(p => p.y)
  const stats = ys.length
    ? { min: Math.min(...ys), max: Math.max(...ys), avg: ys.reduce((a, b) => a + b, 0) / ys.length }
    : null
  const allYs = points.map(p => p.y)
  const current = allYs.length ? (currentValue ? currentValue(data, allYs) : allYs[allYs.length - 1]) : null
  // Variation d'un bout a l'autre de la fenetre visible, pas de la serie entiere.
  const change = ys.length > 1 && ys[0] !== 0 ? (ys[ys.length - 1] - ys[0]) / Math.abs(ys[0]) * 100 : null

  const header = (
    <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
      <div className="min-w-0">
        <h3 className="text-base font-medium flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          {title}{infoText ? <InfoTooltip text={infoText} /> : null}
        </h3>
        {subtitle && <p className="text-xs mt-1" style={{ color: 'var(--color-dim)' }}>{subtitle}</p>}
        {status === 'ok' && current != null && (
          <p className={`${headlineClass} font-medium mt-1 flex flex-wrap items-baseline gap-2`} style={{ color }}>
            <span ref={readoutRef}>{format(current)}</span>
            {change != null && (
              // Couleur neutre : une hausse n'est pas toujours une bonne nouvelle
              // (temps de bloc, mempool), le vert et le rouge le laissaient croire.
              <span className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                {change >= 0 ? '+' : ''}{change.toFixed(change > -1 && change < 1 ? 2 : 1)}%
              </span>
            )}
            {headlineExtra ? headlineExtra(data) : null}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap justify-end">
        <Btn onClick={() => zoomAt(1 / 1.3)} title={t('charts.zoomOut')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="8" y1="11" x2="14" y2="11"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </Btn>
        <Btn onClick={() => zoomAt(1.3)} title={t('charts.zoomIn')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </Btn>
        <Btn onClick={reset} active={zoomed} title={t('charts.resetZoom')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        </Btn>
        <select value={window_} onChange={e => changeWindow(e.target.value)} disabled={switching}
          className="bg-transparent border rounded px-3 py-1.5 text-sm cursor-pointer disabled:opacity-50 disabled:cursor-wait"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
          {windows.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
        <Btn onClick={() => {
          if (!boxRef.current) return
          if (!document.fullscreenElement) boxRef.current.requestFullscreen?.()
          else document.exitFullscreen?.()
        }} title={t('charts.fullscreen')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
        </Btn>
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
      data: visible.map(() => referenceY.value),
      borderColor: theme.success,
      borderWidth: 2,
      borderDash: [6, 4],
      pointRadius: 0,
      fill: false,
    })
  }
  if (extraSeries) {
    for (const serie of extraSeries(data, window_)) {
      datasets.push({
        label: serie.label,
        data: serie.data.slice(i0, i1 + 1),
        borderColor: serie.color,
        backgroundColor: rgba(serie.color, 0.10),
        borderWidth: 1.6,
        borderDash: serie.dash || undefined,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: serie.fill !== undefined ? serie.fill : (bandFill ? '-1' : false),
        tension: 0,
      })
    }
  }

  const chartData = { labels: visible.map(p => p.label), datasets }
  const restoreReadout = () => {
    if (readoutRef.current) readoutRef.current.textContent = format(current)
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: 'index', intersect: false },
    onHover: (evt, elements) => {
      if (!readoutRef.current) return
      const p = elements && elements.length ? visible[elements[0].index] : null
      readoutRef.current.textContent = p ? format(p.y) : format(current)
    },
    plugins: {
      legend: {
        display: showLegend != null ? showLegend : (!!referenceY || !!extraSeries),
        labels: { color: theme.dim, font: { size: 11 }, usePointStyle: true, pointStyle: 'line', boxWidth: 22, boxHeight: 2 },
      },
      crosshair: { format, labels: visible.map(p => p.full ?? p.label) },
      lastValueTag: { format, color },
      tooltip: {
        ...tooltipPlugin,
        callbacks: {
          title: (items) => items.length ? (visible[items[0].dataIndex]?.full ?? '') : '',
          label: (ctx) => [ctx.dataset.label, format(ctx.parsed.y)],
        },
      },
    },
    scales: {
      x: { ticks: { color: theme.dim, font: { size: 10 }, maxRotation: 0, autoSkip: true, autoSkipPadding: 6, maxTicksLimit: 6 }, grid: { display: false } },
      y: {
        max: yMax ?? undefined,
        ticks: { color: theme.dim, font: { size: 10 }, callback: (v) => format(v) },
        grid: { color: theme.grid },
      },
    },
  }

  return wrap(
    <>
      <div
        ref={plotRef}
        tabIndex={0}
        onMouseLeave={restoreReadout}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        className="relative outline-none"
        style={{ height: isFs ? '72vh' : '240px', cursor: 'grab', touchAction: 'pan-y' }}
      >
        <Line key={window_} ref={chartRef} data={chartData} options={options} plugins={[crosshair, lastValueTag]} />
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

      {ranger && n > MIN_POINTS && (
        <>
          <ChartNavigator values={allYs} color={color} range={range} onRange={applyRange} />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] font-mono" style={{ color: 'var(--color-dim)' }}>
            <span>{zoomed
              ? t('charts.showing', { n: visible.length, total: n, from: visible[0]?.full ?? '', to: visible[visible.length - 1]?.full ?? '' })
              : t('charts.showingAll', { n })}</span>
            <span className="hidden sm:inline">{t('charts.gestures')}</span>
          </div>
        </>
      )}

      {context ? context(data) : null}
      {footer ? (
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-5 gap-y-1 mt-3 text-xs font-mono" style={{ color: 'var(--color-dim)' }}>
          {footer(data)}
        </div>
      ) : stats && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs font-mono" style={{ color: 'var(--color-dim)' }}>
          <span>{t('charts.min')} <span style={{ color: 'var(--color-text-secondary)' }}>{format(stats.min)}</span></span>
          <span>{t('charts.avg')} <span style={{ color: 'var(--color-text-secondary)' }}>{format(stats.avg)}</span></span>
          <span>{t('charts.max')} <span style={{ color: 'var(--color-text-secondary)' }}>{format(stats.max)}</span></span>
        </div>
      )}
      {apiPath ? <ApiCall path={typeof apiPath === 'function' ? apiPath(window_) : apiPath} /> : null}
    </>
  )
}
