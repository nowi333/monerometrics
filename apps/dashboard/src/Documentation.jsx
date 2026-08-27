import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import InfraDiagram from './InfraDiagram'
import { api, timeAgo } from './api'

const REPO_URL = 'https://github.com/nowi333/monerometrics'
const CONTACT_EMAIL = 'contact@monerometrics.net'

const ONION_HOST = '6wbhchvavey26lbtscl6w6qg76balycixtsklcggrsslyk4xah6sbbad.onion'

const ENDPOINTS = [
  { m: 'GET', p: '/health', k: 'health' },
  { m: 'GET', p: '/info', k: 'info' },
  { m: 'GET', p: '/network/info', k: 'networkInfo' },
  { m: 'GET', p: '/network/hashrate', k: 'networkHashrate', q: 'window=1h|24h|7d|30d|90d|1y|5y' },
  { m: 'GET', p: '/network/blocktime', k: 'networkBlocktime', q: 'window=1h|24h|7d|30d' },
  { m: 'GET', p: '/network/mempool', k: 'networkMempool', q: 'window=1h|24h|7d|30d|90d|1y|5y' },
  { m: 'GET', p: '/network/emission', k: 'networkEmission', q: 'window=24h|7d|30d|90d|1y|5y' },
  { m: 'GET', p: '/price/spread', k: 'priceSpread', q: 'window=24h|7d|30d|90d|1y' },
  { m: 'GET', p: '/haveno/methods', k: 'havenoMethods', q: 'window=30d|90d|180d|1y|all&currency=USD|EUR' },
  { m: 'GET', p: '/haveno/liquidity', k: 'havenoLiquidity', q: 'window=24h|7d|30d|90d|1y|all&currency=USD|EUR|AUD|GBP' },
  { m: 'GET', p: '/haveno/trades', k: 'havenoTrades', q: 'limit=1..1000&currency=USD|EUR|AUD|GBP' },
  { m: 'GET', p: '/haveno/book', k: 'havenoBook', q: '' },
  { m: 'GET', p: '/chain/window', k: 'chainWindow', q: 'from=INT&to=INT' },
  { m: 'GET', p: '/chain/fork-window', k: 'chainForkWindow', q: 'limit=10..500' },
  { m: 'GET', p: '/reorgs', k: 'reorgs', q: 'limit=1..1000' },
  { m: 'GET', p: '/reorgs/stats', k: 'reorgsStats' },
  { m: 'GET', p: '/orphans/recent', k: 'orphansRecent', q: 'limit=1..500' },
  { m: 'GET', p: '/pools/distribution', k: 'poolsDistribution', q: 'window=1h|6h|24h|48h|7d' },
  { m: 'GET', p: '/pools/sources', k: 'poolsSources' },
]

const ICON_MAIL = 'M2.4 6.6A2.4 2.4 0 0 1 4.8 4.2h14.4a2.4 2.4 0 0 1 2.4 2.4v10.8a2.4 2.4 0 0 1-2.4 2.4H4.8a2.4 2.4 0 0 1-2.4-2.4V6.6Zm2.7-.6 6.9 5.52L18.9 6H5.1Zm14.7 1.62-7.35 5.88a1.2 1.2 0 0 1-1.5 0L4.2 7.62V17.4h15.6V7.62Z'
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

  const [usage, setUsage] = useState(null)
  useEffect(() => {
    let alive = true
    const load = () => api.usageExternal().then(d => { if (alive) setUsage(d.external_requests) }).catch(() => {})
    load()
    const id = setInterval(load, 30000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  const [mcpCopied, setMcpCopied] = useState(false)
  const copyMcp = async () => {
    try {
      await navigator.clipboard.writeText('https://api.monerometrics.net/mcp')
      setMcpCopied(true)
      setTimeout(() => setMcpCopied(false), 2000)
    } catch { }
  }

  const copyOnion = async () => {
    try {
      await navigator.clipboard.writeText(ONION_HOST)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { }
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
        <h2 className="text-lg font-medium mb-3" style={{ color: 'var(--color-text)' }}>{t('doc.reorg.title')}</h2>
        <p className="text-sm mb-3 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{t('doc.reorg.p1')}</p>
        <p className="text-sm mb-3 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{t('doc.reorg.p2')}</p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{t('doc.reorg.p3')}</p>
      </section>

      <section className="rounded-lg border p-5 sm:p-6" style={card}>
        <h2 className="text-lg font-medium mb-4" style={{ color: 'var(--color-text)' }}>{t('doc.metrics.title')}</h2>
        <div className="space-y-3">
          {['nakamoto', 'topPool', 'orphan'].map(k => (
            <div key={k} className="mm-node rounded border p-3">
              <div className="text-sm font-medium mb-1" style={{ color: 'var(--color-accent)' }}>{t('doc.metrics.' + k)}</div>
              <div className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{t('doc.metrics.' + k + 'Text')}</div>
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
        <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{t('doc.sources.text')}</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-5">
          {['viewkey_proof', 'pool_api', 'coinbase_heuristic'].map(m => (
            <div key={m} className="mm-node rounded border p-3">
              <div
                className="text-[10px] inline-block px-1.5 py-0.5 rounded border mb-1.5"
                style={{
                  color: m === 'viewkey_proof' ? 'var(--color-success)' : 'var(--color-dim)',
                  borderColor: m === 'viewkey_proof' ? 'var(--color-success-border)' : 'var(--color-border)',
                  background: m === 'viewkey_proof' ? 'var(--color-success-bg)' : 'transparent',
                }}
              >
                {t('block.source.' + m)}
              </div>
              <div className="text-xs leading-relaxed" style={{ color: 'var(--color-dim)' }}>
                {t('block.source.' + m + 'Help')}
              </div>
            </div>
          ))}
        </div>
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
        <h2 className="text-lg font-medium mb-3" style={{ color: 'var(--color-text)' }}>{t('doc.price.title')}</h2>
        <p className="text-sm mb-3 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{t('doc.price.p1')}</p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{t('doc.price.p2')}</p>
        <p className="text-sm leading-relaxed mt-3" style={{ color: 'var(--color-text-secondary)' }}>{t('doc.price.p3')}</p>
        <p className="text-sm leading-relaxed mt-3" style={{ color: 'var(--color-text-secondary)' }}>{t('doc.price.p4')}</p>
      </section>

      <section className="rounded-lg border p-5 sm:p-6" style={card}>
        <h2 className="text-lg font-medium mb-3" style={{ color: 'var(--color-text)' }}>{t('doc.haveno.title')}</h2>
        <p className="text-sm mb-3 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{t('doc.haveno.p1')}</p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{t('doc.haveno.p2')}</p>
        <p className="text-sm leading-relaxed mt-3" style={{ color: 'var(--color-text-secondary)' }}>{t('doc.haveno.p3')}</p>
      </section>

      <section className="rounded-lg border p-5 sm:p-6" style={card}>
        <h2 className="text-lg font-medium mb-1" style={{ color: 'var(--color-text)' }}>{t('doc.apiTitle')}</h2>
        <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {t('doc.apiP1')} <a href="https://api.monerometrics.net/openapi.json" className="hover:underline" style={{ color: 'var(--color-info)' }}>api.monerometrics.net</a>
        </p>
        {usage != null && (
          <div className="inline-flex items-center gap-2 text-xs mb-4 rounded-full border px-3 py-1" style={{ borderColor: 'var(--color-border)', color: 'var(--color-dim)' }}>
            <span className="relative inline-flex" aria-hidden="true">
              <span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-success)' }} />
              <span className="absolute inset-0 w-2 h-2 rounded-full animate-ping" style={{ background: 'var(--color-success)' }} />
            </span>
            {t('doc.usage', { count: usage.toLocaleString() })}
          </div>
        )}
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

      <section className="rounded-lg border p-5 sm:p-6 relative overflow-hidden" style={card}>
        <div aria-hidden="true" className="pointer-events-none absolute -top-14 -right-10 w-48 h-48 rounded-full" style={{ background: 'color-mix(in srgb, var(--color-accent) 14%, transparent)', filter: 'blur(52px)' }} />
        <div className="relative flex items-start gap-3 mb-4">
          <span className="shrink-0 inline-flex items-center justify-center rounded-lg" style={{ width: 36, height: 36, background: 'color-mix(in srgb, var(--color-accent) 14%, transparent)', color: 'var(--color-accent)' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 7h9M4 12h16M4 17h7" /><circle cx="17.5" cy="7" r="2.2" /><circle cx="13.5" cy="17" r="2.2" />
            </svg>
          </span>
          <div>
            <h2 className="text-lg font-medium mb-1" style={{ color: 'var(--color-text)' }}>{t('doc.mcp.title')}</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)', maxWidth: '60ch' }}>{t('doc.mcp.text')}</p>
          </div>
        </div>
        <button type="button" onClick={copyMcp} title={t('doc.mcp.copy')} className="mm-node relative w-full rounded border p-3 flex items-center justify-between gap-3 text-left">
          <code className="text-xs sm:text-sm font-mono break-all" style={{ color: 'var(--color-text)' }}>https://api.monerometrics.net/mcp</code>
          <span className="text-xs font-mono shrink-0" style={{ color: mcpCopied ? 'var(--color-success)' : 'var(--color-accent)' }}>{mcpCopied ? t('doc.mcp.copied') : t('doc.mcp.copy')}</span>
        </button>
        <p className="text-[11px] mt-3" style={{ color: 'var(--color-dim)' }}>
          {t('doc.mcp.note')}{' '}
          <a href="https://registry.modelcontextprotocol.io/?search=monerometrics" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: 'var(--color-info)' }}>{t('doc.mcp.registry')}</a>
        </p>
      </section>

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
        className="rounded-lg border p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between"
        style={card}
      >
        <div>
          <h2 className="text-lg font-medium mb-1" style={{ color: 'var(--color-text)' }}>{t('doc.contact.title')}</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)', maxWidth: '52ch' }}>{t('doc.contact.text')}</p>
        </div>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="shrink-0 inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-mono transition-colors hover:brightness-110"
          style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-text)', background: 'var(--color-bg)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="shrink-0" style={{ color: 'var(--color-accent)' }}><path d={ICON_MAIL} /></svg>
          {CONTACT_EMAIL}
        </a>
      </section>

      <section
        className="rounded-lg border p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between relative overflow-hidden"
        style={card}
      >
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
