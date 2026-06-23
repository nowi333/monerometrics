import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Line } from 'react-chartjs-2'
import {
  Chart, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend,
} from 'chart.js'
import { api } from './api'
import InfoTooltip from './InfoTooltip'
import { usePolledData } from './usePolledData'

Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend)

const WINDOWS = ['1h', '24h', '7d', '30d']

function fmtLabel(ts, win) {
  const d = new Date(ts * 1000)
  if (win === '1h' || win === '24h') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
function fmtFull(ts) {
  return new Date(ts * 1000).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function BlocktimeChart() {
  const { t } = useTranslation()
  const [window, setWindow] = useState('24h')
  const boxRef = useRef(null)
  const toggleFs = () => {
    if (!boxRef.current) return
    if (!document.fullscreenElement) boxRef.current.requestFullscreen?.()
    else document.exitFullscreen?.()
  }

  const { data, status } = usePolledData(
    () => api.networkBlocktime(window),
    d => d && d.points && d.points.length > 0,
    [window],
  )

  const subtitle =
    status === 'ok'
      ? t('charts.blocktimeStats', { avg: data.avg_delta.toFixed(0), median: data.median_delta })
      : status === 'error'
        ? t('state.apiError')
        : status === 'empty'
          ? t('state.waitingSync')
          : t('state.loading')

  const wrap = (inner) => (
    <div ref={boxRef} className="rounded-lg border p-5 sm:p-6 flex flex-col" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
      <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-base font-medium flex items-center gap-2" style={{ color: 'var(--color-text)' }}>{t('charts.blocktimeTitle')}<InfoTooltip text={t('info.blocktime')} /></h3>
          <p className="text-xs mt-1" style={{ color: status === 'error' ? 'var(--color-warn)' : 'var(--color-dim)' }}>{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={window} onChange={e => setWindow(e.target.value)}
            className="bg-transparent border rounded px-3 py-1 text-sm"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
            {WINDOWS.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
          <button onClick={toggleFs} className="p-1.5 rounded border" title="Fullscreen"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
          </button>
        </div>
      </div>
      <div className="flex-1">{inner}</div>
    </div>
  )

  if (status !== 'ok') {
    return wrap(<div className="text-sm py-10 text-center" style={{ color: status === 'error' ? 'var(--color-warn)' : 'var(--color-dim)' }}>
      {status === 'error' ? t('state.apiError') : status === 'empty' ? t('state.waitingSync') : t('state.loading')}
    </div>)
  }

  const chartData = {
    labels: data.points.map(p => fmtLabel(p.timestamp_unix, window)),
    datasets: [
      {
        label: t('charts.blocktime'),
        data: data.points.map(p => p.delta_seconds),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.2,
      },
      {
        label: t('charts.target'),
        data: data.points.map(() => 120),
        borderColor: 'rgba(34,197,94,0.5)',
        borderWidth: 1.5,
        borderDash: [5, 4],
        pointRadius: 0,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: true, labels: { color: '#8b9099', font: { size: 11 }, boxWidth: 12 } },
      tooltip: {
        callbacks: {
          title: (items) => items.length ? fmtFull(data.points[items[0].dataIndex].timestamp_unix) : '',
          label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}s`,
        },
      },
    },
    scales: {
      x: { ticks: { color: '#8b9099', font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }, grid: { display: false } },
      y: { ticks: { color: '#8b9099', font: { size: 10 }, callback: (v) => `${v}s` }, grid: { color: 'rgba(255,255,255,0.05)' } },
    },
  }

  return wrap(<div style={{ height: document.fullscreenElement ? '85vh' : '260px' }}><Line data={chartData} options={options} /></div>)
}
