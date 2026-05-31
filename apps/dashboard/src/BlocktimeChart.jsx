import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Line } from 'react-chartjs-2'
import {
  Chart, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend,
} from 'chart.js'
import { api } from './api'

Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend)

export default function BlocktimeChart() {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ok | empty | error

  useEffect(() => {
    setStatus('loading')
    api.networkBlocktime('24h')
      .then(d => {
        if (d && d.points && d.points.length > 0) { setData(d); setStatus('ok') }
        else { setData(null); setStatus('empty') }
      })
      .catch(() => { setData(null); setStatus('error') })
  }, [])

  const subtitle =
    status === 'ok'
      ? t('charts.blocktimeStats', { avg: data.avg_delta.toFixed(0), median: data.median_delta })
      : status === 'error'
        ? t('state.apiError')
        : status === 'empty'
          ? t('state.waitingSync')
          : t('state.loading')

  const wrap = (inner) => (
    <div className="rounded-lg border p-6" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-base font-medium" style={{ color: 'var(--color-text)' }}>{t('charts.blocktimeTitle')}</h3>
          <p className="text-xs mt-1" style={{ color: status === 'error' ? 'var(--color-warn)' : 'var(--color-dim)' }}>{subtitle}</p>
        </div>
      </div>
      {inner}
    </div>
  )

  if (status !== 'ok') {
    return wrap(<div className="text-sm py-10 text-center" style={{ color: status === 'error' ? 'var(--color-warn)' : 'var(--color-dim)' }}>
      {status === 'error' ? t('state.apiError') : status === 'empty' ? t('state.waitingSync') : t('state.loading')}
    </div>)
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

  return wrap(<div style={{ height: '240px' }}><Line data={chartData} options={options} /></div>)
}
