import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from './api'
import Panel from './Panel'
import { usePolledData } from './usePolledData'

const COLORS = {
  viewkey_proof: 'var(--color-success)',
  pool_api: 'var(--color-info)',
  pool_api_unproven: 'var(--color-warn)',
  coinbase_heuristic: 'var(--color-purple)',
  none: 'var(--color-dim)',
}

export default function Provenance() {
  const { t } = useTranslation()
  const [window, setWindow] = useState('24h')

  const { data, status, updatedAt } = usePolledData(
    () => api.chainProvenance(window),
    d => d && d.total_blocks > 0,
    [window],
  )

  const wrap = (inner) => (
    <Panel
      title={t('prov.title')}
      info={t('prov.info')}
      subtitle={<span style={{ display: 'inline-block', maxWidth: '62ch' }}>{t('prov.subtitle')}</span>}
      updatedAt={updatedAt}
      status={status}
      stateVariant="chart"
      stateHeight={140}
      control={
        <select value={window} onChange={e => setWindow(e.target.value)}
          className="bg-transparent border rounded px-3 py-1.5 text-sm cursor-pointer"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
          {['1h', '6h', '24h', '48h', '7d'].map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      }
    >{inner}</Panel>
  )

  if (status !== 'ok') return wrap(null)

  const shown = data.breakdown.filter(b => b.block_count > 0)

  return wrap(
    <>
      <div className="flex items-baseline gap-3 mb-4 flex-wrap">
        <span className="text-3xl font-medium" style={{ color: 'var(--color-success)' }}>
          {data.proven_share.toFixed(1)}%
        </span>
        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {t('prov.provenOf', { proven: data.proven, total: data.total_blocks })}
        </span>
      </div>

      <div className="flex h-3 rounded-full overflow-hidden mb-4" style={{ background: 'var(--color-bg)' }}>
        {shown.map(b => (
          <div
            key={b.source}
            title={`${t('block.source.' + b.source, { defaultValue: b.source })}: ${b.percentage}%`}
            style={{ width: `${b.percentage}%`, background: COLORS[b.source] || 'var(--color-dim)' }}
          />
        ))}
      </div>

      <div className="space-y-1.5">
        {shown.map(b => (
          <div key={b.source} className="flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: COLORS[b.source] || 'var(--color-dim)' }} />
            <span className="flex-1 min-w-0 truncate" style={{ color: 'var(--color-text)' }}>
              {t('prov.label.' + b.source, { defaultValue: b.source })}
            </span>
            <span className="font-mono shrink-0" style={{ color: 'var(--color-dim)' }}>{b.block_count}</span>
            <span className="font-mono text-right shrink-0" style={{ color: 'var(--color-text)', minWidth: '52px' }}>
              {b.percentage.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t flex items-baseline gap-2 flex-wrap" style={{ borderColor: 'var(--color-border)' }}>
        <span className="text-lg font-medium" style={{ color: 'var(--color-accent)' }}>
          {data.merge_mined_share.toFixed(1)}%
        </span>
        <span className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {t('prov.mergeMined', { count: data.merge_mined })}
        </span>
      </div>

      {data.unproven_claims > 0 && (
        <p className="text-[11px] mt-3 leading-relaxed" style={{ color: 'var(--color-warn)' }}>
          {t('prov.unprovenWarning', { count: data.unproven_claims })}
        </p>
      )}
    </>
  )
}
