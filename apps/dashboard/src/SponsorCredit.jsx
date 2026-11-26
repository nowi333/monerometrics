import { useTranslation } from 'react-i18next'
import supporters from './supporters.json'

// « — sponsored by X » a cote du titre d'un panneau sponsorise (palier 1 XMR).
// Le sponsor de chaque panneau est tenu dans supporters.json (charts[].panel).
export default function SponsorCredit({ panel }) {
  const { t } = useTranslation()
  const s = (supporters.charts || []).find(c => c.panel === panel)
  if (!s) return null
  return (
    <span className="text-xs font-normal" style={{ color: 'var(--color-dim)' }}>
      — {t('sponsor.by')}{' '}
      <a href={s.url} target="_blank" rel="noopener noreferrer sponsored" className="hover:underline" style={{ color: 'var(--color-text-secondary)' }}>{s.label}</a>
    </span>
  )
}
