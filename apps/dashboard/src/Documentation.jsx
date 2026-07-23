import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import InfraDiagram from './InfraDiagram'
import { api, timeAgo } from './api'

const REPO_URL = 'https://github.com/nowi333/monerometrics'

const ONION_HOST = '6wbhchvavey26lbtscl6w6qg76balycixtsklcggrsslyk4xah6sbbad.onion'

const ENDPOINTS = [
  { m: 'GET', p: '/health', k: 'health' },
  { m: 'GET', p: '/info', k: 'info' },
  { m: 'GET', p: '/network/info', k: 'networkInfo' },
  { m: 'GET', p: '/network/hashrate', k: 'networkHashrate', q: 'window=1h|24h|7d|30d|90d|1y|5y' },
  { m: 'GET', p: '/network/blocktime', k: 'networkBlocktime', q: 'window=1h|24h|7d|30d' },
  { m: 'GET', p: '/network/mempool', k: 'networkMempool', q: 'window=1h|24h|7d|30d|90d|1y|5y' },
  { m: 'GET', p: '/network/emission', k: 'networkEmission', q: 'window=24h|7d|30d|90d|1y|5y' },
  { m: 'GET', p: '/chain/window', k: 'chainWindow', q: 'from=INT&to=INT' },
  { m: 'GET', p: '/chain/fork-window', k: 'chainForkWindow', q: 'limit=10..500' },
  { m: 'GET', p: '/reorgs', k: 'reorgs', q: 'limit=1..1000' },
  { m: 'GET', p: '/reorgs/stats', k: 'reorgsStats' },
  { m: 'GET', p: '/orphans/recent', k: 'orphansRecent', q: 'limit=1..500' },
  { m: 'GET', p: '/pools/distribution', k: 'poolsDistribution', q: 'window=1h|6h|24h|48h|7d' },
  { m: 'GET', p: '/pools/sources', k: 'poolsSources' },
]

const ICON_GITHUB = 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12'

export default function Documentation() {
  const { t } = useTranslation()
  const card = { background: 'var(--color-card)', borderColor: 'var(--color-border)' }
  const [copied, setCopied] = useState(false)


  const [sources, setSources] = useState(null)
  useEffect(() => {
    let alive = true
    api.poolsSources()
      .then(d => {
        if (!alive) return



        const now = Date.now()
        setSources((d.sources || []).map(x => ({
          ...x,
          age_s: x.checked_at ? Math.max(0, Math.floor((now - new Date(x.checked_at).getTime()) / 1000)) : null,
        })))
      })
      .catch(() => { if (alive) setSources([]) })
    return () => { alive = false }
  }, [])

  const copyOnion = async () => {
    try {
      await navigator.clipboard.writeText(ONION_HOST)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignored */ }
  }

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
            <div key={s} className="mm-node rounded border p-3">
              <div className="text-xs font-mono mb-1" style={{ color: 'var(--color-accent)' }}>{i + 1}. {s}</div>
              <div className="text-xs leading-relaxed" style={{ color: 'var(--color-dim)' }}>{t('doc.step' + (i + 1))}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border p-5 sm:p-6" style={card}>
        <h2 className="text-lg font-medium mb-1" style={{ color: 'var(--color-text)' }}>{t('doc.infraTitle')}</h2>
        <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{t('doc.infraP1')}</p>
        <InfraDiagram />
      </section>

      <section className="rounded-lg border p-5 sm:p-6" style={card}>
        <h2 className="text-lg font-medium mb-1" style={{ color: 'var(--color-text)' }}>{t('doc.sources.title')}</h2>
        <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--color-text-secondary)', maxWidth: '70ch' }}>{t('doc.sources.text')}</p>
        {sources === null ? (
          <div className="mm-skeleton h-24 w-full" />
        ) : sources.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--color-dim)' }}>{t('doc.sources.empty')}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sources.map(srx => (
              <div key={srx.pool} className="mm-node rounded border p-3 flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="shrink-0 rounded-full"
                  style={{
                    width: 9, height: 9,
                    background: srx.ok ? 'var(--color-success)' : 'var(--color-danger)',
                    boxShadow: `0 0 8px ${srx.ok ? 'var(--color-success)' : 'var(--color-danger)'}`,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{srx.pool}</div>
                  <div className="text-[11px] font-mono truncate" style={{ color: 'var(--color-dim)' }}>{srx.url}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs font-mono" style={{ color: srx.ok ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    {srx.ok ? t('doc.sources.ok') : t('doc.sources.ko')}
                  </div>
                  <div className="text-[11px]" style={{ color: 'var(--color-dim)' }}>
                    {srx.ok ? `${srx.blocks} ${t('doc.sources.blocks')}` : '—'}
                    {srx.age_s !== null ? ` · ${timeAgo(srx.age_s)}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] mt-3" style={{ color: 'var(--color-dim)' }}>{t('doc.sources.note')}</p>
      </section>

      <section className="rounded-lg border p-5 sm:p-6" style={card}>
        <h2 className="text-lg font-medium mb-1" style={{ color: 'var(--color-text)' }}>{t('doc.apiTitle')}</h2>
        <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {t('doc.apiP1')} <a href="https://api.monerometrics.net/openapi.json" className="hover:underline" style={{ color: 'var(--color-info)' }}>api.monerometrics.net</a>
        </p>
        <div className="space-y-2">
          {ENDPOINTS.map(e => (
            <div key={e.p} className="mm-node rounded border p-3">
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

      {}
      <section className="rounded-lg border p-5 sm:p-6 relative overflow-hidden" style={card}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-14 -right-10 w-48 h-48 rounded-full"
          style={{ background: 'color-mix(in srgb, var(--color-purple) 14%, transparent)', filter: 'blur(52px)' }}
        />
        <div className="relative flex items-start gap-3 mb-4">
          <span
            className="shrink-0 inline-flex items-center justify-center rounded-lg"
            style={{ width: 36, height: 36, background: 'color-mix(in srgb, var(--color-purple) 14%, transparent)', color: 'var(--color-purple)' }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="13.6" r="7.6" />
              <circle cx="12" cy="13.6" r="3.9" />
              <path d="M12 6V2.4" />
            </svg>
          </span>
          <div>
            <h2 className="text-lg font-medium mb-1" style={{ color: 'var(--color-text)' }}>{t('doc.tor.title')}</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)', maxWidth: '58ch' }}>{t('doc.tor.text')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={copyOnion}
          title={t('doc.tor.copy')}
          className="mm-node relative w-full rounded border p-3 flex items-center justify-between gap-3 text-left"
        >
          <code className="text-xs font-mono break-all" style={{ color: 'var(--color-text)' }}>{ONION_HOST}</code>
          <span className="text-xs font-mono shrink-0" style={{ color: copied ? 'var(--color-success)' : 'var(--color-dim)' }}>
            {copied ? t('doc.tor.copied') : t('doc.tor.copy')}
          </span>
        </button>
      </section>

      <section
        className="rounded-lg border p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between relative overflow-hidden"
        style={card}
      >
        {}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-14 -right-10 w-48 h-48 rounded-full"
          style={{ background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)', filter: 'blur(52px)' }}
        />
        <div className="relative">
          <h2 className="text-lg font-medium mb-1" style={{ color: 'var(--color-text)' }}>{t('doc.github.title')}</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)', maxWidth: '52ch' }}>{t('doc.github.text')}</p>
        </div>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mm-node relative shrink-0 inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium text-white"
          style={{ background: 'var(--color-accent)', borderColor: 'transparent' }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={ICON_GITHUB} /></svg>
          {t('doc.github.btn')}
        </a>
      </section>
    </div>
  )
}
