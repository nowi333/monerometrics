import { useTranslation } from 'react-i18next'
import { api } from './api'
import InfoTooltip from './InfoTooltip'
import PanelState from './PanelState'
import { usePolledData } from './usePolledData'

export default function ReorgsStats() {
  const { t } = useTranslation()
  const { data: stats, status } = usePolledData(() => api.reorgsStats(), d => !!(d && d.windows), [])

  if (status !== 'ok') {
    return (
      <div className="bg-[color:var(--color-card)] border border-[color:var(--color-border)] rounded-lg p-6">
        <h3 className="text-base font-medium mb-4 flex items-center gap-2">{t('reorgs.title')}<InfoTooltip text={t('info.reorgs')} /></h3>
        <PanelState status={status} variant="table" height={150} />
      </div>
    )
  }

  return (
    <div className="bg-[color:var(--color-card)] border border-[color:var(--color-border)] rounded-lg p-6">
      <h3 className="text-base font-medium mb-4 flex items-center gap-2">{t('reorgs.title')}<InfoTooltip text={t('info.reorgs')} /></h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px] text-sm">
          <thead>
            <tr className="text-left text-[color:var(--color-dim)] border-b border-[color:var(--color-border)]">
              <th className="py-2 px-2 whitespace-nowrap">{t('reorgs.column.window')}</th>
              <th className="py-2 px-2 text-right whitespace-nowrap">{t('reorgs.column.count')}</th>
              <th className="py-2 px-2 text-right whitespace-nowrap">{t('reorgs.column.avgDepth')}</th>
              <th className="py-2 px-2 text-right whitespace-nowrap">{t('reorgs.column.maxDepth')}</th>
              <th className="py-2 px-2 text-right whitespace-nowrap">{t('reorgs.column.affectedTx')}</th>
            </tr>
          </thead>
          <tbody>
            {stats.windows.map(w => (
              <tr key={w.window} className="border-b border-[color:var(--color-border)]">
                <td className="py-3 px-2 font-mono">{w.window}</td>
                <td className="py-3 px-2 text-right font-mono">{w.count}</td>
                <td className="py-3 px-2 text-right font-mono">{w.avg_depth?.toFixed(2) ?? '-'}</td>
                <td className="py-3 px-2 text-right font-mono">{w.max_depth ?? '-'}</td>
                <td className="py-3 px-2 text-right font-mono">{w.total_affected_tx}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
