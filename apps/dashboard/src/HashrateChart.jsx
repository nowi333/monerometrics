import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Line } from 'react-chartjs-2'
import {
  Chart, LineElement, PointElement, LinearScale, CategoryScale,
  Tooltip, Legend, Filler,
} from 'chart.js'
import { api, formatHashrate } from './api'

Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler)

export default function HashrateChart() {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ok | empty | error
  const [window, setWindow] = useState('30d')

  useEffect(() => {
    setStatus('loading')
    api.networkHashrate(window)
      .then(d => {
        if (d && d.points && d.points.length > 0) { setData(d); setStatus('ok') }
        else { setData(null); setStatus('empty') }
      })
      .catch(() => { setData(null); setStatus('error') })
  }, [window])

  const header = (
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-base font-medium" style={{ color: 'var(--color-text)' }}>{t('charts.hashrateTitle')}</h3>
      <select value={window} onChange={e => setWindow(e.target.value)}
        className="bg-transparent border rounded px-3 py-1 text-sm"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
        <option value="24h">24h</option>
        <option value="7d">7d</option>
        <option value="30d">30d</option>
      </select>
    </div>
  )

  const wrap = (inner) => (
    <div className="rounded-lg border p-6" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
      {header}
      {inner}
    </div>
  )

  if (status === 'loading') return wrap(<div className="text-sm py-12 text-center" style={{ color: 'var(--color-dim)' }}>{t('state.loading')}</div>)
  if (status === 'error') return wrap(<div className="text-sm py-12 text-center" style={{ color: 'var(--color-warn)' }}>{t('state.apiError')}</div>)
  if (status === 'empty') return wrap(<div className="text-sm py-12 text-center" style={{ color: 'var(--color-dim)' }}>{t('state.waitingSync')}</div>)

  const labels = data.points.map(p => {
    const d = new Date(p.bucket)
    return window === '24h'
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  })

  const chartData = {
    labels,
    datasets: [{
      label: t('charts.hashrate'),
      data: data.points.map(p => p.hashrate_h_s),
      borderColor: '#ff6600',
      backgroundColor: 'rgba(255,102,0,0.1)',
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      fill: true,
      tension: 0.3,
    }],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: (ctx) => formatHashrate(ctx.parsed.y) },
      },
    },
    scales: {
      x: { ticks: { color: '#8b9099', font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }, grid: { display: false } },
      y: { ticks: { color: '#8b9099', font: { size: 10 }, callback: (v) => formatHashrate(v) }, grid: { color: 'rgba(255,255,255,0.05)' } },
    },
  }

  return wrap(<div style={{ height: '240px' }}><Line data={chartData} options={options} /></div>)
}
