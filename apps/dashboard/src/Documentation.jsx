import { useTranslation } from 'react-i18next'

const ENDPOINTS = [
  { m: 'GET', p: '/health', k: 'health' },
  { m: 'GET', p: '/info', k: 'info' },
  { m: 'GET', p: '/network/info', k: 'networkInfo' },
  { m: 'GET', p: '/network/hashrate', k: 'networkHashrate', q: 'window=24h|7d|30d' },
  { m: 'GET', p: '/network/blocktime', k: 'networkBlocktime', q: 'window=24h|7d|30d' },
  { m: 'GET', p: '/chain/window', k: 'chainWindow', q: 'from=INT&to=INT' },
  { m: 'GET', p: '/chain/fork-window', k: 'chainForkWindow', q: 'limit=10..500' },
  { m: 'GET', p: '/reorgs', k: 'reorgs', q: 'limit=1..1000' },
  { m: 'GET', p: '/reorgs/stats', k: 'reorgsStats' },
  { m: 'GET', p: '/orphans/recent', k: 'orphansRecent', q: 'limit=1..500' },
  { m: 'GET', p: '/pools/distribution', k: 'poolsDistribution', q: 'window=24h|7d|30d' },
]

export default function Documentation() {
  const { t } = useTranslation()
  const card = { background: 'var(--color-card)', borderColor: 'var(--color-border)' }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-5 sm:p-6" style={card}>
        <h2 className="text-lg font-medium mb-3" style={{ color: 'var(--color-text)' }}>{t('doc.aboutTitle')}</h2>
        <p className="text-sm mb-3 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{t('doc.aboutP1')}</p>
        <p className="text-sm mb-3 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{t('doc.aboutP2')}</p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{t('doc.aboutP3')}</p>
      </section>

      <section className="rounded-lg border p-5 sm:p-6" style={card}>
        <h2 className="text-lg font-medium mb-1" style={{ color: 'var(--color-text)' }}>{t('doc.howTitle')}</h2>
        <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{t('doc.howP1')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {['Monerod', 'Indexer', 'Database', 'API'].map((s, i) => (
            <div key={s} className="rounded border p-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-elevated)' }}>
              <div className="text-xs font-mono mb-1" style={{ color: 'var(--color-accent)' }}>{i + 1}. {s}</div>
              <div className="text-xs leading-relaxed" style={{ color: 'var(--color-dim)' }}>{t('doc.step' + (i + 1))}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border p-5 sm:p-6" style={card}>
        <h2 className="text-lg font-medium mb-1" style={{ color: 'var(--color-text)' }}>{t('doc.apiTitle')}</h2>
        <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {t('doc.apiP1')} <a href="https://api.monerometrics.net/openapi.json" className="hover:underline" style={{ color: 'var(--color-info)' }}>api.monerometrics.net</a>
        </p>
        <div className="space-y-2">
          {ENDPOINTS.map(e => (
            <div key={e.p} className="rounded border p-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-elevated)' }}>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>{e.m}</span>
                <code className="text-sm font-mono break-all" style={{ color: 'var(--color-text)' }}>{e.p}</code>
                {e.q && <code className="text-xs font-mono" style={{ color: 'var(--color-dim)' }}>?{e.q}</code>}
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{t('doc.ep.' + e.k)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
