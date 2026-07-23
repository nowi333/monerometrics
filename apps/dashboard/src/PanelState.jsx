import { useTranslation } from 'react-i18next'
import { useNetworkInfo } from './NetworkContext'

export default function PanelState({ status, variant = 'block', height = 240 }) {
  const { t } = useTranslation()
  const { info } = useNetworkInfo()

  if (status === 'loading') return <Skeleton variant={variant} height={height} />

  const isEmpty = status === 'empty'
  const color = status === 'error' ? 'var(--color-warn)' : 'var(--color-dim)'
  const pct = isEmpty && info && !info.synced ? info.sync_pct : null

  let message
  if (status === 'error') message = t('state.apiError')
  else if (pct != null) message = t('state.syncProgress', { pct })
  else if (isEmpty) message = t('state.waitingSync')
  else message = t('state.loading')

  return (
    <div
      className="flex flex-col items-center justify-center gap-3 text-sm text-center px-4"
      style={{ minHeight: height, color }}
    >
      {pct != null && (
        <div className="w-44 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--color-accent)' }} />
        </div>
      )}
      <span style={{ maxWidth: '38ch' }}>{message}</span>
    </div>
  )
}

function Skeleton({ variant, height }) {
  if (variant === 'table') {
    return (
      <div className="flex flex-col gap-2.5" style={{ minHeight: height }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="mm-skeleton" style={{ height: 26, opacity: 1 - i * 0.14 }} />
        ))}
      </div>
    )
  }

  return <div className="mm-skeleton" style={{ height, width: '100%' }} />
}
