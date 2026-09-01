import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from './api'
import BlockDetailModal from './BlockDetailModal'
import Panel from './Panel'
import { usePolledData } from './usePolledData'

const toUnix = (s) => (s ? Math.floor(Date.parse(s) / 1000) || null : null)

export default function OrphansTable() {
  const { t } = useTranslation()
  const [selected, setSelected] = useState(null)
  const { data, status } = usePolledData(() => api.orphansRecent(20), d => Array.isArray(d && d.orphans), [])

  const openOrphan = (o) => setSelected({
    block: {
      hash: o.orphan_hash,
      height: o.height,
      miner_pool: o.miner_pool,
      pool_source: o.pool_source,
      tx_count: o.tx_count,
      timestamp_unix: toUnix(o.timestamp_human),
    },
    isOrphan: true,
    agoSeconds: (() => { const u = toUnix(o.timestamp_human); return u ? Math.floor(Date.now() / 1000) - u : 0 })(),
  })
  const openCanonical = (o) => setSelected({
    block: { hash: o.canonical_hash, height: o.height },
    isOrphan: false,
    agoSeconds: 0,
  })
  const viewOnChain = (o) => window.dispatchEvent(new CustomEvent('mm:focus-block', { detail: { height: o.height } }))

  const wrap = (inner) => (
    <Panel title={t('orphans.title')} info={t('info.orphans')}
      status={status} stateVariant="table" stateHeight={140}>{inner}</Panel>
  )

  if (status !== 'ok') return wrap(null)

  const orphans = data.orphans

  return wrap(
    <>
      {orphans.length === 0 ? (
        <div className="text-center text-[color:var(--color-dim)] py-8">
          {t('state.noOrphans')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full sm:min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-[color:var(--color-dim)] border-b border-[color:var(--color-border)]">
                <th className="py-2 px-2 whitespace-nowrap">{t('orphans.column.height')}</th>
                <th className="py-2 px-2 whitespace-nowrap">{t('orphans.column.orphanHash')}</th>
                <th className="py-2 px-2 whitespace-nowrap hidden sm:table-cell">{t('orphans.column.canonicalHash')}</th>
                <th className="py-2 px-2 whitespace-nowrap">{t('orphans.column.pool')}</th>
                <th className="py-2 px-2 text-right whitespace-nowrap hidden sm:table-cell">{t('orphans.column.tx')}</th>
                <th className="py-2 px-2 text-right whitespace-nowrap"></th>
              </tr>
            </thead>
            <tbody>
              {orphans.map(o => (
                <tr key={o.orphan_hash} className="border-b border-[color:var(--color-border)]">
                  <td className="py-2 px-1.5 sm:px-2 font-mono">{o.height}</td>
                  <td className="py-2 px-1.5 sm:px-2 text-xs whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openOrphan(o)}
                      title={t('orphans.viewOrphan')}
                      className="font-mono text-orange-400 rounded hover:underline underline-offset-2 inline-flex items-center gap-1 transition-opacity hover:opacity-80"
                    >
                      <span className="sm:hidden">{o.orphan_hash.slice(0, 8)}…</span>
                      <span className="hidden sm:inline">{o.orphan_hash.slice(0, 12)}...</span>
                    </button>
                  </td>
                  <td className="py-2 px-2 text-xs whitespace-nowrap hidden sm:table-cell">
                    {o.canonical_hash ? (
                      <button
                        type="button"
                        onClick={() => openCanonical(o)}
                        title={t('orphans.viewCanonical')}
                        className="font-mono text-green-400 rounded hover:underline underline-offset-2 inline-flex items-center gap-1 transition-opacity hover:opacity-80"
                      >
                        {o.canonical_hash.slice(0, 12)}...
                      </button>
                    ) : (
                      <span className="font-mono text-[color:var(--color-dim)]">—</span>
                    )}
                  </td>
                  <td className="py-2 px-1.5 sm:px-2 text-xs">{o.miner_pool ?? 'unknown'}</td>
                  <td className="py-2 px-2 text-right font-mono hidden sm:table-cell">{o.tx_count}</td>
                  <td className="py-2 px-1.5 sm:px-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => viewOnChain(o)}
                      title={t('orphans.viewOnChain')}
                      className="inline-flex items-center gap-1 text-xs rounded border px-1.5 sm:px-2 py-1 transition-all hover:brightness-110 active:scale-[0.98]"
                      style={{ borderColor: 'color-mix(in srgb, var(--color-accent) 40%, var(--color-border))', color: 'var(--color-accent)' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      <span className="hidden sm:inline">{t('orphans.viewOnChain')}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <BlockDetailModal selected={selected} onClose={() => setSelected(null)} />
    </>
  )
}
