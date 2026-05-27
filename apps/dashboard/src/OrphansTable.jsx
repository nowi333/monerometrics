import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from './api'

export default function OrphansTable() {
  const { t } = useTranslation()
  const [orphans, setOrphans] = useState(null)

  useEffect(() => {
    api.orphansRecent(20).then(d => setOrphans(d.orphans)).catch(() => setOrphans([]))
  }, [])

  if (orphans === null) {
    return <div className="text-[color:var(--color-dim)] text-sm p-4">{t('state.loadingOrphans')}</div>
  }

  return (
    <div className="bg-[color:var(--color-card)] border border-[color:var(--color-border)] rounded-lg p-6">
      <h3 className="text-base font-medium mb-4">{t('orphans.title')}</h3>
      {orphans.length === 0 ? (
        <div className="text-center text-[color:var(--color-dim)] py-8">
          {t('state.noOrphans')}
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[color:var(--color-dim)] border-b border-[color:var(--color-border)]">
              <th className="py-2 px-2">{t('orphans.column.height')}</th>
              <th className="py-2 px-2">{t('orphans.column.orphanHash')}</th>
              <th className="py-2 px-2">{t('orphans.column.canonicalHash')}</th>
              <th className="py-2 px-2">{t('orphans.column.pool')}</th>
              <th className="py-2 px-2 text-right">{t('orphans.column.tx')}</th>
            </tr>
          </thead>
          <tbody>
            {orphans.map(o => (
              <tr key={o.orphan_hash} className="border-b border-[color:var(--color-border)]">
                <td className="py-2 px-2 font-mono">{o.height}</td>
                <td className="py-2 px-2 font-mono text-orange-400 text-xs">{o.orphan_hash.slice(0, 12)}...</td>
                <td className="py-2 px-2 font-mono text-green-400 text-xs">{o.canonical_hash?.slice(0, 12)}...</td>
                <td className="py-2 px-2 text-xs">{o.miner_pool ?? 'unknown'}</td>
                <td className="py-2 px-2 text-right font-mono">{o.tx_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
