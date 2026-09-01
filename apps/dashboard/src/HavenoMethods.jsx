import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from './api'
import Panel from './Panel'
import { usePolledData } from './usePolledData'

const WINDOWS = ['90d', '180d', '1y', 'all']

export default function HavenoMethods() {
  const { t } = useTranslation()
  const [window, setWindow] = useState('180d')

  const { data, status, updatedAt } = usePolledData(
    () => api.havenoMethods(window),
    d => d && d.methods && d.methods.length > 0,
    [window],
    300000,
  )

  const wrap = (inner) => (
    <Panel
      title={t('haveno.methods.title')}
      info={t('info.havenoMethods')}
      subtitle={status === 'ok'
        ? t('haveno.methods.subtitle', { count: data.trades_total, source: data.spot_source || '—' })
        : t('haveno.methods.lead')}
      updatedAt={updatedAt}
      status={status}
      emptyText={t('haveno.methods.empty')}
      stateHeight={200}
      control={
        <select value={window} onChange={e => setWindow(e.target.value)}
          className="bg-transparent border rounded px-3 py-1 text-sm shrink-0"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
          {WINDOWS.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      }
    >{inner}</Panel>
  )

  if (status !== 'ok') return wrap(null)

  const span = Math.max(...data.methods.map(m => Math.abs(m.avg_premium_pct ?? 0)), 1)

  return wrap(
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: 'var(--color-dim)' }} className="text-[10px] uppercase tracking-wide">
            <th className="text-left font-medium pb-2">{t('haveno.methods.method')}</th>
            <th className="text-right font-medium pb-2 pl-3">{t('haveno.methods.trades')}</th>
            <th className="text-right font-medium pb-2 pl-3 hidden sm:table-cell">{t('haveno.methods.volume')}</th>
            <th className="text-right font-medium pb-2 pl-3">{t('haveno.methods.premium')}</th>
            <th className="text-left font-medium pb-2 pl-3 w-[38%] hidden sm:table-cell"></th>
          </tr>
        </thead>
        <tbody style={{ fontFamily: 'var(--font-mono)' }}>
          {data.methods.map(m => {
            const p = m.avg_premium_pct ?? 0
            const color = m.reversible === true ? 'var(--color-danger)'
              : m.reversible === false ? 'var(--color-success)' : 'var(--color-dim)'
            return (
              <tr key={m.payment_method} style={{ borderTop: '1px solid var(--color-border)' }}>
                <td className="py-2 pr-2" style={{ color: 'var(--color-text)' }}>
                  <span className="block leading-tight">{m.payment_method.replace(/_/g, ' ').toLowerCase()}</span>
                  {m.reversible != null && (
                    <span className="text-[9.5px] uppercase tracking-wide" style={{ color }}>
                      {m.reversible ? t('haveno.methods.reversible') : t('haveno.methods.final')}
                    </span>
                  )}
                </td>
                <td className="py-2 pl-3 text-right tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>{m.trades}</td>
                <td className="py-2 pl-3 text-right tabular-nums hidden sm:table-cell" style={{ color: 'var(--color-text-secondary)' }}>
                  {m.volume_xmr != null ? Math.round(m.volume_xmr).toLocaleString() : '—'}
                </td>
                <td className="py-2 pl-3 text-right font-semibold tabular-nums whitespace-nowrap" style={{ color }}>
                  {p > 0 ? '+' : ''}{p.toFixed(2)}%
                </td>
                <td className="py-2 pl-3 hidden sm:table-cell">
                  <div className="h-2 rounded-sm" style={{
                    width: `${Math.max(2, (Math.abs(p) / span) * 100)}%`,
                    background: color, opacity: 0.55,
                  }} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
