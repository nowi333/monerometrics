import { useTranslation } from 'react-i18next'
import { api } from './api'
import InfoTooltip from './InfoTooltip'
import PanelState from './PanelState'
import { usePolledData } from './usePolledData'

const TIER_COLOR = { slow: 'var(--color-success)', normal: 'var(--color-info)', fast: 'var(--color-warn)', fastest: 'var(--color-danger)' }

export default function FeeEstimator() {
  const { t } = useTranslation()
  const { data, status } = usePolledData(
    () => api.networkFees(),
    d => d && d.tiers && d.tiers.length > 0,
    [],
    60000,
  )

  const header = (
    <div className="mb-4">
      <h3 className="text-base font-medium flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
        {t('fees.title')}<InfoTooltip text={t('info.fees')} />
      </h3>
      <p className="text-xs mt-1" style={{ color: 'var(--color-dim)' }}>{t('fees.subtitle')}</p>
    </div>
  )

  const wrap = (inner) => (
    <div className="rounded-lg border p-4 sm:p-6" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
      {header}
      {inner}
    </div>
  )

  if (status !== 'ok') return wrap(<PanelState status={status} height={160} />)

  const usd = (n) => n != null ? `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'

  return wrap(
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {data.tiers.map(tier => (
          <div key={tier.tier} className="rounded-lg border p-3" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide mb-2" style={{ color: TIER_COLOR[tier.tier] }}>
              <span className="w-2 h-2 rounded-sm" style={{ background: TIER_COLOR[tier.tier] }} />
              {t(`fees.tier.${tier.tier}`)}
            </div>
            <div className="font-mono text-xl leading-none" style={{ color: 'var(--color-text)' }}>{usd(tier.typical_usd)}</div>
            <div className="font-mono text-[11px] mt-1.5" style={{ color: 'var(--color-dim)' }}>{tier.typical_xmr.toFixed(5)} XMR</div>
          </div>
        ))}
      </div>
      <p className="text-[11px] leading-relaxed mt-3" style={{ color: 'var(--color-dim)' }}>{t('fees.note')}</p>
    </>
  )
}
