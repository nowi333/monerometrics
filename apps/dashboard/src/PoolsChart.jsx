import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Doughnut } from 'react-chartjs-2'
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js'
import { api } from './api'

Chart.register(ArcElement, Tooltip, Legend)

const COLORS = ['#ff6600', '#3b82f6', '#22c55e', '#a78bfa', '#f59e0b', '#06b6d4', '#ef4444', '#ec4899']

export default function PoolsChart() {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [window, setWindow] = useState('24h')

  useEffect(() => {
    api.poolsDistribution(window).then(setData).catch(() => setData(null))
  }, [window])

  if (!data) {
    return <div className="text-[color:var(--color-dim)] text-sm p-4">{t('state.loadingPools')}</div>
  }

  const chartData = {
    labels: data.distribution.map(p => p.pool),
    datasets: [{
      data: data.distribution.map(p => p.block_count),
      backgroundColor: COLORS,
      borderColor: '#0b0d12',
      borderWidth: 2,
    }],
  }

  const options = {
    plugins: {
      legend: {
        position: 'right',
        labels: { color: '#e6e8eb', font: { size: 12 } },
      },
    },
    maintainAspectRatio: false,
  }

  return (
    <div className="bg-[color:var(--color-card)] border border-[color:var(--color-border)] rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-medium">{t('pools.title')}</h3>
        <select
          value={window}
          onChange={e => setWindow(e.target.value)}
          className="bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded px-3 py-1 text-sm"
        >
          <option value="24h">{t('pools.window.24h')}</option>
          <option value="7d">{t('pools.window.7d')}</option>
          <option value="30d">{t('pools.window.30d')}</option>
        </select>
      </div>
      <div className="text-xs text-[color:var(--color-dim)] mb-3">
        {t('pools.total', { count: data.total_blocks.toLocaleString() })}
      </div>
      {data.distribution.length === 0 ? (
        <div className="text-center text-[color:var(--color-dim)] py-12">
          {t('state.noData')}
        </div>
      ) : (
        <div style={{ height: '300px' }}>
          <Doughnut data={chartData} options={options} />
        </div>
      )}
    </div>
  )
}
