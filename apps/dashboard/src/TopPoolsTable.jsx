import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from './api'

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

// Mock realiste base sur parts de marche reelles
function buildMock() {
  const dist = [
    { pool: 'supportxmr.com', block_count: 36, percentage: 36.0 },
    { pool: 'nanopool.org', block_count: 21, percentage: 21.0 },
    { pool: 'p2pool', block_count: 12, percentage: 12.0 },
    { pool: 'hashvault.pro', block_count: 9, percentage: 9.0 },
    { pool: 'kryptex.com', block_count: 7, percentage: 7.0 },
    { pool: 'moneroocean.stream', block_count: 6, percentage: 6.0 },
    { pool: 'c3pool.com', block_count: 4, percentage: 4.0 },
    { pool: 'unknown', block_count: 5, percentage: 5.0 },
  ]
  return { window: '24h', total_blocks: 100, distribution: dist, _mock: true }
}

export default function TopPoolsTable() {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [isMock, setIsMock] = useState(false)
  const [window, setWindow] = useState('24h')

  useEffect(() => {
    api.poolsDistribution(window)
      .then(d => {
        if (d && d.distribution && d.distribution.length > 0) { setData(d); setIsMock(false) }
        else { setData(buildMock()); setIsMock(true) }
      })
      .catch(() => { setData(buildMock()); setIsMock(true) })
  }, [window])

  if (!data) {
    return <div className="text-sm p-4" style={{ color: 'var(--color-dim)' }}>{t('state.loadingPools')}</div>
  }

  return (
    <div className="rounded-lg border p-6" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-base font-medium" style={{ color: 'var(--color-text)' }}>{t('toppools.title')}</h3>
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

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b" style={{ color: 'var(--color-dim)', borderColor: 'var(--color-border)' }}>
            <th className="py-2 px-2 text-xs uppercase tracking-wide">{t('toppools.pool')}</th>
            <th className="py-2 px-2 text-xs uppercase tracking-wide text-right">{t('toppools.blocks')}</th>
            <th className="py-2 px-2 text-xs uppercase tracking-wide text-right">{t('toppools.share')}</th>
            <th className="py-2 px-2 text-xs uppercase tracking-wide" style={{ width: '30%' }}>{t('toppools.distribution')}</th>
          </tr>
        </thead>
        <tbody>
          {data.distribution.map(p => (
            <tr key={p.pool} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
              <td className="py-2.5 px-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: poolColor(p.pool) }} />
                  <span style={{ color: 'var(--color-text)' }}>{p.pool}</span>
                </div>
              </td>
              <td className="py-2.5 px-2 text-right font-mono" style={{ color: 'var(--color-text)' }}>{p.block_count}</td>
              <td className="py-2.5 px-2 text-right font-mono" style={{ color: 'var(--color-text)' }}>{p.percentage.toFixed(1)}%</td>
              <td className="py-2.5 px-2">
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-bg)' }}>
                  <div className="h-full rounded-full" style={{ width: `${p.percentage}%`, background: poolColor(p.pool) }} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-xs mt-3" style={{ color: 'var(--color-dim)' }}>
        {t('toppools.total', { count: data.total_blocks })}
      </div>
    </div>
  )
}
