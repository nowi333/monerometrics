import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import InfoTooltip from './InfoTooltip'
import PanelState from './PanelState'

const ago = (s) => (s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : `${Math.floor(s / 3600)}h`)

export function Updated({ at }) {
  const { t } = useTranslation()
  const [secs, setSecs] = useState(() => Math.max(0, Math.floor((Date.now() - at) / 1000)))
  useEffect(() => {
    const tick = () => setSecs(Math.max(0, Math.floor((Date.now() - at) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [at])
  return (
    <span className="text-[10px] font-mono whitespace-nowrap" style={{ color: 'var(--color-dim)' }}>
      {t('panel.updated', { ago: ago(secs) })}
    </span>
  )
}

/**
 * Coquille commune a tous les panneaux : carte, en-tete, etat de chargement
 * et date de mesure. Les panneaux qui rendent eux-memes leur vide (table
 * d'orphelins par exemple) omettent `status` et gerent leurs enfants.
 */
export default function Panel({
  title, info = null, subtitle = null, control = null, updatedAt = null,
  status = null, emptyText = null, stateHeight = 240, stateVariant = 'block',
  footer = null, className = '', children,
}) {
  const showState = status != null && status !== 'ok'
  return (
    <div
      className={`rounded-lg border p-4 sm:p-6 ${className}`}
      style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
    >
      <div className="flex justify-between items-start gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-base font-medium flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            {title}{info ? <InfoTooltip text={info} /> : null}
          </h3>
          {subtitle && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-dim)' }}>{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {updatedAt != null && <Updated at={updatedAt} />}
          {control}
        </div>
      </div>
      {showState
        ? <PanelState status={status} height={stateHeight} variant={stateVariant} emptyText={emptyText} />
        : children}
      {!showState && footer}
    </div>
  )
}
