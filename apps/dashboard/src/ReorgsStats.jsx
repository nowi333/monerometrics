import { useTranslation } from 'react-i18next'
import { api } from './api'
import Panel from './Panel'
import { usePolledData } from './usePolledData'

// Memes seuils que le bandeau d'etat : une profondeur de 1 est la respiration
// normale du reseau, deux blocs trouves presque en meme temps dont l'un cede la
// place. Au-dela, la chaine a reecrit quelque chose qui tenait deja.
const WATCH_DEPTH = 2
const ALERT_DEPTH = 5
// Nombre de temoins de profondeur affiches. Au-dela, le chiffre parle seul.
const PIPS = 6

// En francais, le premier jour du mois s'ecrit « 1er », jamais « 1 ».
function dateLongue(iso, langue) {
  const d = new Date(iso)
  const texte = d.toLocaleDateString(langue, { day: 'numeric', month: 'long', year: 'numeric' })
  return langue.startsWith('fr') && d.getDate() === 1 ? texte.replace(/^1\b/, '1er') : texte
}

function severity(maxDepth) {
  if (!maxDepth) return 'var(--color-success)'
  if (maxDepth >= ALERT_DEPTH) return 'var(--color-danger)'
  if (maxDepth >= WATCH_DEPTH) return 'var(--color-warn)'
  return 'var(--color-info)'
}

export default function ReorgsStats() {
  const { t, i18n } = useTranslation()
  const { data: stats, status } = usePolledData(() => api.reorgsStats(), d => !!(d && d.windows), [])

  const wrap = (inner) => (
    <Panel
      title={t('reorgs.title')}
      info={t('info.reorgs')}
      subtitle={status === 'ok' && stats.since ? t('reorgs.since', { d: dateLongue(stats.since, i18n.language) }) : null}
      status={status} stateVariant="table" stateHeight={150} apiPath="/reorgs/stats">{inner}</Panel>
  )

  if (status !== 'ok') return wrap(null)

  const card = (w) => {
    const color = severity(w.max_depth)
    const quiet = !w.count
    return (
      <div
        key={w.window}
        className="rounded-lg border p-3 flex flex-col"
        style={{
          background: 'var(--color-card)',
          borderColor: quiet ? 'var(--color-border)' : `color-mix(in srgb, ${color} 35%, var(--color-border))`,
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
          <span className="text-[11px] font-mono uppercase tracking-wider" style={{ color: 'var(--color-dim)' }}>
            {w.window === 'all' ? t('reorgs.all') : w.window}
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-medium" style={{ fontFamily: 'var(--font-mono)', color: quiet ? 'var(--color-dim)' : 'var(--color-text)' }}>
            {quiet ? t('reorgs.none') : w.count}
          </span>
          {!quiet && (
            <span className="text-[11px]" style={{ color: 'var(--color-dim)' }}>{t('reorgs.unit')}</span>
          )}
        </div>

        {/* La profondeur compte plus que le nombre : une seule reorg profonde
            est un evenement, vingt reorgs de profondeur 1 n'en sont pas un. */}
        <div className="mt-3 flex items-center gap-2">
          <span className="flex gap-1" aria-hidden="true">
            {Array.from({ length: PIPS }).map((_, i) => (
              <span
                key={i}
                className="w-1.5 h-3 rounded-[1px]"
                style={{
                  background: i < (w.max_depth || 0) ? color : 'var(--color-border)',
                  opacity: i < (w.max_depth || 0) ? 1 : 0.5,
                }}
              />
            ))}
          </span>
          <span className="text-[11px] font-mono" style={{ color: quiet ? 'var(--color-dim)' : color }}>
            {w.max_depth ? t('reorgs.depthValue', { n: w.max_depth }) : '—'}
          </span>
        </div>

        <div className="mt-3 pt-2 border-t grid grid-cols-2 gap-1 text-[11px]" style={{ borderColor: 'var(--color-border)' }}>
          <span style={{ color: 'var(--color-dim)' }}>{t('reorgs.column.avgDepth')}</span>
          <span className="text-right font-mono" style={{ color: 'var(--color-text-secondary)' }}>
            {w.avg_depth != null ? w.avg_depth.toFixed(2) : '—'}
          </span>
          <span style={{ color: 'var(--color-dim)' }}>{t('reorgs.column.affectedTx')}</span>
          <span className="text-right font-mono" style={{ color: 'var(--color-text-secondary)' }}>
            {w.total_affected_tx ? w.total_affected_tx.toLocaleString() : '—'}
          </span>
        </div>
      </div>
    )
  }

  return wrap(
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.windows.map(card)}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed" style={{ color: 'var(--color-dim)' }}>
        {t('reorgs.routine')}
      </p>
    </>
  )
}
