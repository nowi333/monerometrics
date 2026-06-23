import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Line } from 'react-chartjs-2'
import {
  Chart, LineElement, PointElement, LinearScale, CategoryScale,
  Tooltip, Legend, Filler,
} from 'chart.js'
import { api } from './api'
import { usePolledData } from './usePolledData'

Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler)

const WINDOWS = ['24h', '7d', '30d', '90d', '1y', '5y']
const COLOR = '#22c55e'

function fmtLabel(bucket, win) {
  const d = new Date(bucket)
  if (win === '24h') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (win === '7d') return d.toLocaleDateString([], { weekday: 'short', hour: '2-digit' })
  if (win === '5y') return d.toLocaleDateString([], { month: 'short', year: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
function fmtFull(bucket) {
  return new Date(bucket).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtXmr(v) {
  return `${Number(v).toFixed(4)} XMR`
}

export default function EmissionChart() {
  const { t } = useTranslation()
  const [window, setWindow] = useState('30d')
  const boxRef = useRef(null)
  const toggleFs = () => {
    if (!boxRef.current) return
    if (!document.fullscreenElement) boxRef.current.requestFullscreen?.()
    else document.exitFullscreen?.()
  }

  const { data, status } = usePolledData(
    () => api.networkEmission(window),
    d => d && d.points && d.points.length > 0,
    [window],
  )

  const current = data && data.points.length ? Number(data.points[data.points.length - 1].avg_reward_xmr) : null

  const header = (
    <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
      <div>
        <h3 className="text-base font-medium" style={{ color: 'var(--color-text)' }}>{t('charts.emissionTitle')}</h3>
        {status === 'ok' && current != null && (
          <p className="text-2xl font-medium mt-1" style={{ color: COLOR }}>{fmtXmr(current)}</p>
        )}
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
  )

  const wrap = (inner) => (
    <div ref={boxRef} className="rounded-lg border p-5 sm:p-6 flex flex-col" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
      {header}
      <div className="flex-1">{inner}</div>
    </div>
  )

  if (status === 'loading') return wrap(<div className="text-sm py-12 text-center" style={{ color: 'var(--color-dim)' }}>{t('state.loading')}</div>)
  if (status === 'error') return wrap(<div className="text-sm py-12 text-center" style={{ color: 'var(--color-warn)' }}>{t('state.apiError')}</div>)
  if (status === 'empty') return wrap(<div className="text-sm py-12 text-center" style={{ color: 'var(--color-dim)' }}>{t('state.waitingSync')}</div>)

  const chartData = {
    labels: data.points.map(p => fmtLabel(p.bucket, window)),
    datasets: [{
      label: t('charts.emissionTitle'),
      data: data.points.map(p => Number(p.avg_reward_xmr)),
      borderColor: COLOR,
      backgroundColor: 'rgba(34,197,94,0.12)',
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 5,
      fill: true,
      tension: 0.25,
    }],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => items.length ? fmtFull(data.points[items[0].dataIndex].bucket) : '',
          label: (ctx) => fmtXmr(ctx.parsed.y),
        },
      },
    },
    scales: {
      x: { ticks: { color: '#8b9099', font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }, grid: { display: false } },
      y: { ticks: { color: '#8b9099', font: { size: 10 }, callback: (v) => Number(v).toFixed(2) }, grid: { color: 'rgba(255,255,255,0.05)' } },
    },
  }

  return wrap(<div style={{ height: document.fullscreenElement ? '85vh' : '260px' }}><Line data={chartData} options={options} /></div>)
}
