import { useTranslation } from 'react-i18next'
import Panel from './Panel'

/**
 * Annonce du suivi des flux XMR sur THORChain, avant l'activation de la chaine.
 * Statique : aucune requete, rien a charger.
 */
const Node = ({ label, sub, accent }) => (
  <div
    className="flex flex-col items-center justify-center rounded-full w-16 h-16 sm:w-20 sm:h-20 shrink-0 border-2"
    style={{
      borderColor: accent ? 'var(--color-accent)' : 'var(--color-border-strong)',
      background: 'var(--color-bg-elevated)',
    }}
  >
    <span className="text-sm sm:text-base font-semibold" style={{ color: accent ? 'var(--color-accent)' : 'var(--color-text)' }}>{label}</span>
    <span className="text-[10px]" style={{ color: 'var(--color-dim)' }}>{sub}</span>
  </div>
)

const Flow = () => (
  <div className="relative flex-1 h-0.5 min-w-6 overflow-hidden" style={{ background: 'var(--color-border-strong)' }}>
    <span className="tc-flow absolute inset-y-0 w-1/3" style={{ background: 'linear-gradient(90deg, transparent, var(--color-accent), transparent)' }} />
  </div>
)

export default function ThorchainSoon() {
  const { t } = useTranslation()
  const items = ['volume', 'depth', 'slippage', 'halts']
  return (
    <Panel
      title={t('thorchain.title')}
      control={
        <span className="text-xs font-semibold px-2 py-1 rounded-full uppercase tracking-wide"
          style={{ color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }}>
          {t('thorchain.soon')}
        </span>
      }
    >
      <style>{`
        @keyframes tc-flow { from { transform: translateX(-100%) } to { transform: translateX(300%) } }
        .tc-flow { animation: tc-flow 2.4s linear infinite }
        @media (prefers-reduced-motion: reduce) { .tc-flow { animation: none; display: none } }
      `}</style>
      <div className="flex items-center gap-2 sm:gap-4 max-w-md mx-auto my-4" aria-hidden="true">
        <Node label="BTC" sub="native" />
        <Flow />
        <Node label="RUNE" sub="pool" />
        <Flow />
        <Node label="XMR" sub="native" accent />
      </div>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
        {t('thorchain.lead')}
      </p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 text-sm">
        {items.map(k => (
          <li key={k} className="rounded-md px-3 py-2 border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
            {t(`thorchain.${k}`)}
          </li>
        ))}
      </ul>
      <p className="text-xs mt-4" style={{ color: 'var(--color-dim)' }}>{t('thorchain.footer')}</p>
    </Panel>
  )
}
