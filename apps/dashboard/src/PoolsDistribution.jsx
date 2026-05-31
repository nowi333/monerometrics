import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Doughnut } from 'react-chartjs-2'
import { Chart, ArcElement, Tooltip } from 'chart.js'
import { api } from './api'

Chart.register(ArcElement, Tooltip)

const POOL_COLORS = {
  'supportxmr.com': '#ff6600',
  'p2pool': '#3b82f6',
  'hashvault.pro': '#22c55e',
  'moneroocean.stream': '#a78bfa',
  'c3pool.com': '#f59e0b',
  'nanopool.org': '#06b6d4',
  'kryptex.com': '#ec4899',
  'unknown': '#6b7280',
}
function poolColor(p) { return POOL_COLORS[p] || POOL_COLORS['unknown'] }

export default function PoolsDistribution() {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ok | empty | error
  const [window, setWindow] = useState('24h')

  useEffect(() => {
    setStatus('loading')
    api.poolsDistribution(window)
      .then(d => {
        if (d && d.distribution && d.distribution.length > 0) { setData(d); setStatus('ok') }
        else { setData(null); setStatus('empty') }
      })
      .catch(() => { setData(null); setStatus('error') })
  }, [window])

  const header = (
    <div className="flex justify-between items-center mb-4">
      <div>
        <h3 className="text-base font-medium" style={{ color: 'var(--color-text)' }}>{t('toppools.title')}</h3>
        <p className="text-xs mt-1" style={{ color: status === 'error' ? 'var(--color-warn)' : 'var(--color-dim)' }}>
          {status === 'ok' ? t('toppools.total', { count: data.total_blocks })
            : status === 'error' ? t('state.apiError')
              : status === 'empty' ? t('state.waitingSync')
                : t('state.loadingPools')}
        </p>
      </div>
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

  if (status !== 'ok') {
    return wrap(
      <div className="text-sm py-12 text-center" style={{ color: status === 'error' ? 'var(--color-warn)' : 'var(--color-dim)' }}>
        {status === 'error' ? t('state.apiError') : status === 'empty' ? t('state.waitingSync') : t('state.loadingPools')}
      </div>
    )
  }

  const chartData = {
    labels: data.distribution.map(p => p.pool),
    datasets: [{
      data: data.distribution.map(p => p.block_count),
      backgroundColor: data.distribution.map(p => poolColor(p.pool)),
      borderColor: 'var(--color-card)',
      borderWidth: 2,
      hoverOffset: 4,
    }],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const p = data.distribution[ctx.dataIndex]
            return `${p.pool}: ${p.block_count} (${p.percentage.toFixed(1)}%)`
          },
        },
      },
    },
  }

  return wrap(
    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6 items-center">
      <div className="relative mx-auto" style={{ width: '180px', height: '180px' }}>
        <Doughnut data={chartData} options={chartOptions} />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-medium" style={{ color: 'var(--color-text)' }}>{data.distribution.length}</span>
          <span className="text-xs" style={{ color: 'var(--color-dim)' }}>{t('toppools.poolsUnit')}</span>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left" style={{ color: 'var(--color-dim)' }}>
            <th className="pb-2 text-xs uppercase tracking-wide font-normal">{t('toppools.pool')}</th>
            <th className="pb-2 text-xs uppercase tracking-wide font-normal text-right">{t('toppools.blocks')}</th>
            <th className="pb-2 text-xs uppercase tracking-wide font-normal text-right" style={{ width: '42%' }}>{t('toppools.share')}</th>
          </tr>
        </thead>
        <tbody>
          {data.distribution.map(p => (
            <tr key={p.pool}>
              <td className="py-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: poolColor(p.pool) }} />
                  <span style={{ color: 'var(--color-text)' }}>{p.pool}</span>
                </div>
              </td>
              <td className="py-1 text-right font-mono" style={{ color: 'var(--color-text)' }}>{p.block_count}</td>
              <td className="py-1">
                <div className="flex items-center gap-2 justify-end">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg)' }}>
                    <div className="h-full rounded-full" style={{ width: `${p.percentage}%`, background: poolColor(p.pool) }} />
                  </div>
                  <span className="font-mono text-right" style={{ color: 'var(--color-text)', minWidth: '44px' }}>{p.percentage.toFixed(1)}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
