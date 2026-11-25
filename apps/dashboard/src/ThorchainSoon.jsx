import { useTranslation } from 'react-i18next'
import Panel from './Panel'
import { api, timeAgo } from './api'
import { usePolledData } from './usePolledData'

/**
 * Section THORChain avant l'activation de XMR : ce qui va etre mesure, et une
 * liste de verification en direct de l'integration (pool, vault, echanges).
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

const Flow = ({ reverse }) => (
  <div className="relative flex-1 h-0.5 min-w-6 overflow-hidden" style={{ background: 'var(--color-border-strong)' }}>
    <span className={`tc-flow absolute inset-y-0 w-1/3 ${reverse ? 'tc-rev' : ''}`}
      style={{ background: 'linear-gradient(90deg, transparent, var(--color-accent), transparent)' }} />
  </div>
)

const WATCH = ['volume', 'netflow', 'depth', 'cost', 'large', 'health']

function Check({ done, label }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs shrink-0"
        style={done
          ? { background: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid var(--color-success-border)' }
          : { color: 'var(--color-dim)', border: '1px dashed var(--color-border-strong)' }}
        aria-hidden="true">{done ? '✓' : ''}</span>
      <span style={{ color: done ? 'var(--color-text)' : 'var(--color-text-secondary)' }}>{label}</span>
    </li>
  )
}

export default function ThorchainSoon() {
  const { t } = useTranslation()
  const { data } = usePolledData(
    // L'age se calcule a la reception : Date.now() n'a pas sa place dans le rendu.
    () => api.thorchainStatus().then(d => d && { ...d, age: d.checked_at ? Date.now() / 1000 - d.checked_at : null }),
    d => d && d.source, [], 600000)
  const pool = data?.pool
  const ago = data?.age != null ? timeAgo(Math.max(0, data.age)) : null

  return (
    <Panel
      title={t('thorchain.title')}
      apiPath="/thorchain/status"
      control={
        <span className="text-xs font-semibold px-2 py-1 rounded-full uppercase tracking-wide"
          style={{ color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }}>
          {data?.live ? t('thorchain.live') : t('thorchain.soon')}
        </span>
      }
    >
      <style>{`
        @keyframes tc-flow { from { transform: translateX(-100%) } to { transform: translateX(300%) } }
        .tc-flow { animation: tc-flow 2.4s linear infinite }
        .tc-rev { animation-direction: reverse; animation-delay: -1.2s }
        @media (prefers-reduced-motion: reduce) { .tc-flow { animation: none; display: none } }
      `}</style>

      <div className="flex items-center gap-2 sm:gap-4 max-w-md mx-auto my-4" aria-hidden="true">
        <Node label="BTC" sub="native" />
        <Flow />
        <Node label="RUNE" sub="pool" />
        <Flow reverse />
        <Node label="XMR" sub="native" accent />
      </div>

      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{t('thorchain.lead')}</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5">
        <div className="rounded-md border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-elevated)' }}>
          <h4 className="text-xs uppercase tracking-wide mb-3" style={{ color: 'var(--color-dim)' }}>{t('thorchain.statusTitle')}</h4>
          <ul className="space-y-2">
            <Check done={!!pool} label={t('thorchain.checkPool')} />
            <Check done={!!data?.inbound_address} label={t('thorchain.checkVault')} />
            <Check done={!!data?.live} label={t('thorchain.checkTrading')} />
          </ul>
          {pool && (
            <p className="text-xs mt-3" style={{ color: 'var(--color-text-secondary)' }}>
              {t('thorchain.depth', { xmr: pool.xmr_depth.toLocaleString(undefined, { maximumFractionDigits: 1 }), status: pool.status })}
            </p>
          )}
          <p className="text-xs mt-3" style={{ color: 'var(--color-dim)' }}>
            {data?.source === 'thornode'
              ? t('thorchain.checked', { ago, count: data.chains_live.length })
              : t('thorchain.unavailable')}
          </p>
        </div>

        <ul className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {WATCH.map(k => (
            <li key={k} className="rounded-md px-3 py-2 border" style={{ borderColor: 'var(--color-border)' }}>
              <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{t(`thorchain.w.${k}`)}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-dim)' }}>{t(`thorchain.w.${k}Desc`)}</div>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs mt-4 leading-relaxed" style={{ color: 'var(--color-dim)' }}>{t('thorchain.privacy')} {t('thorchain.footer')}</p>
    </Panel>
  )
}
