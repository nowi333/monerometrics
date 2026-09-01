import { useTranslation } from 'react-i18next'
import InfoTooltip from './InfoTooltip'

const ORD = { en: (n) => `${n}th`, fr: (n) => `${n}e`, es: (n) => `${n}º` }

function ordinal(n, lang) {
  const f = ORD[(lang || 'en').slice(0, 2)] || ORD.en
  return f(n)
}

/** Seuils volontairement larges : on qualifie l'inhabituel, pas le bon ou le mauvais. */
function band(pct) {
  if (pct >= 90) return { key: 'high', color: 'var(--color-warn)' }
  if (pct <= 10) return { key: 'low', color: 'var(--color-warn)' }
  return null
}

function Cell({ label, value, sub, color, info }) {
  return (
    <div className="px-3 py-2.5" style={{ background: 'var(--color-card)' }}>
      <div className="text-[9px] uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--color-dim)' }}>
        {label}{info ? <InfoTooltip text={info} size={12} /> : null}
      </div>
      <div className="font-mono text-[15px] font-semibold mt-1 flex items-center gap-1.5 flex-wrap"
        style={{ color: color || 'var(--color-text)' }}>{value}</div>
      <div className="text-[10px] mt-0.5 leading-snug" style={{ color: 'var(--color-dim)' }}>{sub}</div>
    </div>
  )
}

/**
 * Situe la valeur courante dans son propre historique.
 *
 * Le panneau ne l'affiche pas quand l'API renvoie `stats: null`, c'est-a-dire
 * quand la serie est trop courte : un percentile sur quelques points aurait
 * l'air autoritaire sans rien signifier.
 */
export default function ContextStrip({ stats, format = (v) => v, signed = null }) {
  const { t, i18n } = useTranslation()
  if (!stats || stats.percentile == null) return null

  const b = band(stats.percentile)
  const days = stats.span_days
  const span = days == null ? null
    : days >= 360 ? t('ctx.spanYear')
    : t('ctx.spanDays', { count: Math.max(1, Math.round(days)) })

  const pct = (v) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`)
  const sig = signed || pct

  return (
    <div className="grid gap-px mt-4 rounded-lg overflow-hidden border"
      style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(146px,1fr))',
        background: 'var(--color-border)', borderColor: 'var(--color-border)' }}>
      <Cell
        label={t('ctx.percentile')}
        info={t('ctx.percentileInfo')}
        value={<>
          {ordinal(stats.percentile, i18n.language)}
          {b && <span className="text-[8.5px] font-medium px-1.5 py-0.5 rounded"
            style={{ background: 'color-mix(in srgb, var(--color-warn) 15%, transparent)', color: 'var(--color-warn)' }}>
            {t(`ctx.${b.key}`)}
          </span>}
        </>}
        sub={span ? t('ctx.percentileSub', { span }) : null}
        color={b ? b.color : null}
      />
      {stats.z_robust != null && (
        <Cell label={t('ctx.deviation')} info={t('ctx.deviationInfo')} value={`${stats.z_robust > 0 ? '+' : ''}${stats.z_robust.toFixed(1)}σ`}
          sub={t('ctx.deviationSub', { median: format(stats.median) })} />
      )}
      {stats.change_pct != null && (
        <Cell label={span ? t('ctx.changeOver', { span }) : t('ctx.change')} info={t('ctx.changeInfo')} value={sig(stats.change_pct)}
          sub={t('ctx.changeSub', { from: format(stats.current / (1 + stats.change_pct / 100)) })}
          color={stats.change_pct >= 0 ? 'var(--color-success)' : 'var(--color-danger)'} />
      )}
      <Cell label={t('ctx.range')} info={t('ctx.rangeInfo')} value={format(stats.maximum)}
        sub={t('ctx.rangeSub', { min: format(stats.minimum) })} />
    </div>
  )
}
