import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Doughnut } from 'react-chartjs-2'
import { Chart, ArcElement, Tooltip } from 'chart.js'
import { api } from './api'
import InfoTooltip from './InfoTooltip'
import PanelState from './PanelState'
import { usePolledData } from './usePolledData'
import { poolColor } from './poolColors'

Chart.register(ArcElement, Tooltip)

export default function PoolsDistribution() {
  const { t } = useTranslation()
  const [window, setWindow] = useState('24h')

  const { data, status } = usePolledData(
    () => api.poolsDistribution(window),
    d => d && d.distribution && d.distribution.length > 0,
    [window],
  )

  const header = (
    <div className="flex justify-between items-center mb-4">
      <div>
        <h3 className="text-base font-medium flex items-center gap-2" style={{ color: 'var(--color-text)' }}>{t('toppools.title')}<InfoTooltip text={t('info.pools')} /></h3>
        {status === 'ok' && (
          <p className="text-xs mt-1" style={{ color: 'var(--color-dim)' }}>
            {t('toppools.total', { count: data.total_blocks })}
          </p>
        )}
      </div>
      <select value={window} onChange={e => setWindow(e.target.value)}
        className="bg-transparent border rounded px-3 py-1 text-sm"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
        <option value="1h">1h</option>
        <option value="6h">6h</option>
        <option value="24h">24h</option>
        <option value="48h">48h</option>
        <option value="7d">7d</option>
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
    return wrap(<PanelState status={status} variant="chart" height={220} />)
  }

  const chartData = {
    labels: data.distribution.map(p => p.pool),
    datasets: [{
      data: data.distribution.map(p => p.block_count),
      backgroundColor: data.distribution.map(p => poolColor(p.pool)),


      borderWidth: 0,
      borderRadius: 4,
      spacing: 3,
      hoverOffset: 10,
      hoverBorderWidth: 0,
    }],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    animation: { animateRotate: true, duration: 600 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'var(--color-bg-elevated)',
        titleColor: 'var(--color-text)',
        bodyColor: 'var(--color-text-secondary)',
        borderColor: 'var(--color-border-strong)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        displayColors: true,
        boxPadding: 4,
        callbacks: {
          label: (ctx) => {
            const p = data.distribution[ctx.dataIndex]
            return `${p.pool}: ${p.block_count} (${p.percentage.toFixed(1)}%)`
          },
        },
      },
    },
  }

  const concentrated = data.top_pool_share > 50

  return wrap(
    <>
    {}
    <div className="flex flex-wrap gap-3 mb-5">
      <div className="flex-1 min-w-[150px] rounded-lg border px-3 py-2"
        style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
        <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--color-dim)' }}>{t('toppools.topPool')} {window}</div>
        <div className="text-sm font-medium mt-0.5 flex items-center gap-2" style={{ color: concentrated ? 'var(--color-warn)' : 'var(--color-text)' }}>
          {data.top_pool ? (<><span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: poolColor(data.top_pool) }} />{data.top_pool} · {data.top_pool_share.toFixed(1)}%</>) : '—'}
        </div>
      </div>
      <div className="flex-1 min-w-[150px] rounded-lg border px-3 py-2"
        style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
        <div className="text-[11px] uppercase tracking-wide flex items-center gap-1" style={{ color: 'var(--color-dim)' }}>
          {t('toppools.nakamoto')}<InfoTooltip text={t('info.nakamoto')} />
        </div>
        <div className="text-sm font-medium mt-0.5" style={{ color: 'var(--color-text)' }}>
          {data.nakamoto_coefficient || '—'} <span className="text-xs" style={{ color: 'var(--color-dim)' }}>{t('toppools.nakamotoUnit')}</span>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 items-center">
      <div className="relative mx-auto" style={{ width: '200px', height: '200px' }}>
        <Doughnut data={chartData} options={chartOptions} />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-medium leading-none" style={{ color: concentrated ? 'var(--color-warn)' : 'var(--color-text)' }}>{data.distribution.length}</span>
          <span className="text-[11px] mt-1" style={{ color: 'var(--color-dim)' }}>{t('toppools.poolsUnit')}</span>
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
    </>
  )
}
