import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Line } from 'react-chartjs-2'
import {
  Chart, LineElement, PointElement, LinearScale, CategoryScale,
  Tooltip, Legend, Filler,
} from 'chart.js'
import { api, formatHashrate } from './api'

Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler)

// Donnees mockees : courbe hashrate realiste (~5 GH/s avec variations)
function buildMock(window) {
  const points = []
  const n = window === '24h' ? 24 : window === '7d' ? 7 : 30
  const now = Date.now()
  const stepMs = window === '24h' ? 3600e3 : 86400e3
  let base = 5.1e9
  for (let i = n - 1; i >= 0; i--) {
    base += (Math.random() - 0.5) * 0.4e9
    base = Math.max(4.2e9, Math.min(5.9e9, base))
    points.push({
      bucket: new Date(now - i * stepMs).toISOString(),
      hashrate_h_s: Math.round(base),
    })
  }
  return { window, bucket_size: window === '24h' ? '1 hour' : '1 day', points, _mock: true }
}

export default function HashrateChart() {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [isMock, setIsMock] = useState(false)
  const [window, setWindow] = useState('30d')

  useEffect(() => {
    api.networkHashrate(window)
      .then(d => {
        if (d && d.points && d.points.length > 0) { setData(d); setIsMock(false) }
        else { setData(buildMock(window)); setIsMock(true) }
      })
      .catch(() => { setData(buildMock(window)); setIsMock(true) })
  }, [window])

  if (!data) {
    return <div className="text-sm p-4" style={{ color: 'var(--color-dim)' }}>{t('state.loading')}</div>
  }

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

  return (
    <div className="rounded-lg border p-6" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-base font-medium" style={{ color: 'var(--color-text)' }}>{t('charts.hashrateTitle')}</h3>
          {isMock && <p className="text-xs mt-1" style={{ color: 'var(--color-dim)' }}>{t('fork.mockNotice')}</p>}
        </div>
        <select value={window} onChange={e => setWindow(e.target.value)}
          className="bg-transparent border rounded px-3 py-1 text-sm"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
          <option value="24h">24h</option>
          <option value="7d">7d</option>
          <option value="30d">30d</option>
        </select>
      </div>
      <div style={{ height: '240px' }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  )
}
