import { useTranslation } from 'react-i18next'
import { api } from './api'
import InfoTooltip from './InfoTooltip'
import { usePolledData } from './usePolledData'

const COLOR = {
  ok: 'var(--color-success)',
  watch: 'var(--color-warn)',
  alert: 'var(--color-danger)',
}

/**
 * La reponse en une phrase a la question que le tableau de bord existe pour
 * trancher. Le verdict n'est jamais affiche seul : la ligne du dessous porte
 * les mesures qui l'ont produit, et l'infobulle les seuils, parce qu'un
 * verdict dont on ne peut pas verifier les seuils est une opinion.
 */
export default function StatusBanner() {
  const { t } = useTranslation()
  const { data, status } = usePolledData(() => api.status(), d => d && d.level, [], 60000)
  if (status !== 'ok') return null

  const seuils = data.signals.map(s => `${s.label} — ${s.threshold}`).join('\n')

  const tone = COLOR[data.chain === 'ok' && data.concentration === 'ok' ? 'ok' : (data.concentration === 'alert' || data.chain === 'alert' ? 'alert' : 'watch')]

  return (
    <div
      className="mb-6 rounded-2xl border px-4 py-3.5 sm:px-5 sm:py-4"
      style={{
        background: `linear-gradient(180deg, color-mix(in srgb, ${tone} 9%, var(--color-card)) 0%, var(--color-card) 100%)`,
        borderColor: `color-mix(in srgb, ${tone} 30%, var(--color-border))`,
      }}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
          style={{ background: COLOR[data.chain], boxShadow: `0 0 0 4px color-mix(in srgb, ${COLOR[data.chain]} 18%, transparent)` }}
          aria-hidden="true" />
        <span className="text-lg sm:text-xl font-medium" style={{ color: 'var(--color-text)' }}>
          {t(`status.chain.${data.chain}`)}
        </span>
        <span style={{ color: 'var(--color-border-strong)' }}>·</span>
        {/* Le point d'interrogation reste solidaire du verdict : seul, il
            tombait sur une ligne a lui des que la largeur manquait. */}
        <span className="inline-flex items-center gap-2">
          <span className="text-lg sm:text-xl font-medium" style={{ color: COLOR[data.concentration] }}>
            {t(`status.conc.${data.concentration}`)}
          </span>
          <InfoTooltip text={`${t('status.info')}\n\n${seuils}`} size={14} />
        </span>
      </div>
      <div className="mt-3 pt-3 border-t flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] font-mono"
        style={{ color: 'var(--color-dim)', borderColor: `color-mix(in srgb, ${tone} 18%, var(--color-border))` }}>
        {data.signals.map(s => (
          <span key={s.key}>
            {t(`status.sig.${s.key}`)}{' '}
            <span style={{ color: s.level === 'ok' ? 'var(--color-text-secondary)' : COLOR[s.level] }}>
              {s.display}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
