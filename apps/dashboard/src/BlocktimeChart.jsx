import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Line } from 'react-chartjs-2'
import {
  Chart, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend,
} from 'chart.js'
import { api } from './api'

Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend)

// Donnees mockees : block times autour de 120s (cible Monero)
function buildMock() {
  const points = []
  const n = 60
  let height = 3683700
  let ts = Math.floor(Date.now() / 1000) - n * 120
  for (let i = 0; i < n; i++) {
    const delta = Math.max(10, Math.round(120 + (Math.random() - 0.5) * 140))
    ts += delta
    points.push({ height: height + i, timestamp_unix: ts, delta_seconds: delta })
  }
  const deltas = points.map(p => p.delta_seconds).sort((a, b) => a - b)
  return {
    window: '24h',
    avg_delta: deltas.reduce((a, b) => a + b, 0) / deltas.length,
    median_delta: deltas[Math.floor(deltas.length / 2)],
    points,
    _mock: true,
  }
}

export default function BlocktimeChart() {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [isMock, setIsMock] = useState(false)

  useEffect(() => {
    api.networkBlocktime('24h')
      .then(d => {
        if (d && d.points && d.points.length > 0) { setData(d); setIsMock(false) }
        else { setData(buildMock()); setIsMock(true) }
      })
      .catch(() => { setData(buildMock()); setIsMock(true) })
  }, [])

  if (!data) {
    return <div className="text-sm p-4" style={{ color: 'var(--color-dim)' }}>{t('state.loading')}</div>
  }

  const chartData = {
    labels: data.points.map(p => p.height.toString().slice(-4)),
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
    plugins: {
      legend: { display: true, labels: { color: '#8b9099', font: { size: 11 }, boxWidth: 12 } },
      tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}s` } },
    },
    scales: {
      x: { ticks: { color: '#8b9099', font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }, grid: { display: false } },
      y: { ticks: { color: '#8b9099', font: { size: 10 }, callback: (v) => `${v}s` }, grid: { color: 'rgba(255,255,255,0.05)' } },
    },
  }

  return (
    <div className="rounded-lg border p-6" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-base font-medium" style={{ color: 'var(--color-text)' }}>{t('charts.blocktimeTitle')}</h3>
          <p className="text-xs mt-1" style={{ color: 'var(--color-dim)' }}>
            {isMock ? t('fork.mockNotice') : t('charts.blocktimeStats', { avg: data.avg_delta.toFixed(0), median: data.median_delta })}
          </p>
        </div>
      </div>
      <div style={{ height: '240px' }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  )
}
