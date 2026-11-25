import { useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Page « Build » : tout ce qu'il faut pour brancher monerometrics ailleurs,
 * en exemples a copier. Statique : aucune requete au chargement.
 */
const API = 'https://api.monerometrics.net'

const QUICKSTART = {
  curl: `curl -s ${API}/status`,
  javascript: `const res = await fetch('${API}/status')
const { level, signals } = await res.json()
console.log(level, signals.find(s => s.key === 'top_pool').display)`,
  python: `import httpx

status = httpx.get('${API}/status').json()
print(status['level'], status['signals'][0]['display'])`,
}

const RECIPES = [
  {
    k: 'badge',
    lang: 'markdown',
    code: `[![largest pool](${API}/badge/top-pool.svg)](https://monerometrics.net)
[![last reorg](${API}/badge/last-reorg.svg)](https://monerometrics.net)`,
  },
  {
    k: 'bot',
    lang: 'python',
    code: `# Post every new Monero reorg to a Discord channel
import os, time, httpx

WEBHOOK = os.environ['DISCORD_WEBHOOK']
seen = None
while True:
    r = httpx.get('${API}/reorgs?limit=1').json()['reorgs'][0]
    if seen is not None and r['id'] != seen:
        httpx.post(WEBHOOK, json={'content':
            f"Reorg depth {r['depth']} at height {r['fork_point_height']}, "
            f"{r['affected_tx_count']} txs displaced"})
    seen = r['id']
    time.sleep(120)`,
  },
  {
    k: 'checkout',
    lang: 'javascript',
    code: `// Before shipping an order paid in XMR
const r = await fetch('${API}/confirmations/recommended?amount_usd=' + order.usd)
const { recommended } = await r.json()
if (payment.confirmations >= recommended.confirmations) ship(order)`,
  },
  {
    k: 'thorchain',
    lang: 'bash',
    code: `# Wait for native XMR on THORChain, then run your own script
until curl -s ${API}/thorchain/status | jq -e '.live' >/dev/null
do sleep 600; done
./my-swap.sh   # your wallet, your keys`,
  },
  {
    k: 'agent',
    lang: 'json',
    code: `{
  "mcpServers": {
    "monerometrics": {
      "type": "http",
      "url": "${API}/mcp"
    }
  }
}`,
  },
]

const ENDPOINTS = [
  ['/status', 'status'],
  ['/reorgs', 'reorgs'],
  ['/orphans/recent', 'orphans'],
  ['/pools/distribution', 'pools'],
  ['/chain/provenance', 'provenance'],
  ['/network/fees', 'fees'],
  ['/confirmations/recommended', 'confirmations'],
  ['/price/spread', 'haveno'],
  ['/haveno/index', 'havenoIndex'],
  ['/reports/2026-10', 'reports'],
  ['/thorchain/status', 'thorchain'],
]

const card = { background: 'var(--color-card)', borderColor: 'var(--color-border)' }

function Code({ code, label }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* presse-papiers refuse : rien a faire */ }
  }
  return (
    <div className="rounded-md border overflow-hidden" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <span className="text-[11px] font-mono uppercase tracking-wide" style={{ color: 'var(--color-dim)' }}>{label}</span>
        <button type="button" onClick={copy} className="text-xs font-mono hover:opacity-80"
          style={{ color: copied ? 'var(--color-success)' : 'var(--color-accent)' }}>
          {copied ? t('build.copied') : t('build.copy')}
        </button>
      </div>
      <pre className="p-3 text-xs sm:text-[13px] leading-relaxed overflow-x-auto font-mono" style={{ color: 'var(--color-text)' }}><code>{code}</code></pre>
    </div>
  )
}

export default function Build() {
  const { t } = useTranslation()
  const [lang, setLang] = useState('curl')

  return (
    <div className="space-y-5">
      <section className="rounded-lg border p-5 sm:p-8 relative overflow-hidden" style={card}>
        <div aria-hidden="true" className="pointer-events-none absolute -top-16 -right-10 w-64 h-64 rounded-full"
          style={{ background: 'color-mix(in srgb, var(--color-accent) 16%, transparent)', filter: 'blur(60px)' }} />
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl font-semibold" style={{ color: 'var(--color-text)' }}>{t('build.title')}</h1>
          <p className="text-sm sm:text-base mt-2 leading-relaxed" style={{ color: 'var(--color-text-secondary)', maxWidth: '62ch' }}>{t('build.lead')}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {['free', 'nokey', 'limit', 'tor', 'mit'].map(k => (
              <span key={k} className="text-xs rounded-full border px-3 py-1" style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-text-secondary)' }}>
                {t(`build.pill.${k}`)}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border p-5 sm:p-6" style={card}>
        <h2 className="text-lg font-medium mb-1" style={{ color: 'var(--color-text)' }}>{t('build.quickTitle')}</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>{t('build.quickText')}</p>
        <div className="flex gap-1 mb-3" role="tablist">
          {Object.keys(QUICKSTART).map(k => (
            <button key={k} type="button" role="tab" aria-selected={lang === k} onClick={() => setLang(k)}
              className="text-xs font-mono px-3 py-1.5 rounded-md border"
              style={lang === k
                ? { borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }
                : { borderColor: 'var(--color-border)', color: 'var(--color-dim)' }}>
              {k}
            </button>
          ))}
        </div>
        <Code code={QUICKSTART[lang]} label={lang} />
      </section>

      <section>
        <h2 className="text-lg font-medium mb-3 px-1" style={{ color: 'var(--color-text)' }}>{t('build.recipesTitle')}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {RECIPES.map(r => (
            <div key={r.k} className="rounded-lg border p-5 flex flex-col gap-3 min-w-0" style={card}>
              <div>
                <h3 className="text-base font-medium" style={{ color: 'var(--color-text)' }}>{t(`build.r.${r.k}`)}</h3>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-dim)' }}>{t(`build.r.${r.k}Desc`)}</p>
              </div>
              <Code code={r.code} label={r.lang} />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border p-5 sm:p-6" style={card}>
        <h2 className="text-lg font-medium mb-3" style={{ color: 'var(--color-text)' }}>{t('build.endpointsTitle')}</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ENDPOINTS.map(([p, k]) => (
            <li key={p} className="rounded border px-3 py-2 min-w-0" style={{ borderColor: 'var(--color-border)' }}>
              <a href={`${API}${p}`} className="text-sm font-mono hover:underline break-all" style={{ color: 'var(--color-info)' }}>{p}</a>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-dim)' }}>{t(`build.ep.${k}`)}</div>
            </li>
          ))}
        </ul>
        <p className="text-xs mt-4" style={{ color: 'var(--color-dim)' }}>
          <a href={`${API}/docs`} className="hover:underline" style={{ color: 'var(--color-info)' }}>{t('build.allDocs')}</a>
          {' · '}
          <a href={`${API}/openapi.json`} className="hover:underline" style={{ color: 'var(--color-info)' }}>OpenAPI</a>
          {' · '}
          <a href={`${API}/llms.txt`} className="hover:underline" style={{ color: 'var(--color-info)' }}>llms.txt</a>
          {' · '}
          <a href={`${API}/changelog`} className="hover:underline" style={{ color: 'var(--color-info)' }}>{t('build.changelog')}</a>
        </p>
      </section>

      <section className="rounded-lg border p-5 sm:p-6" style={card}>
        <h2 className="text-lg font-medium mb-1" style={{ color: 'var(--color-text)' }}>{t('build.usedTitle')}</h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {t('build.usedText')}{' '}
          <a href="mailto:contact@monerometrics.net" className="hover:underline" style={{ color: 'var(--color-info)' }}>contact@monerometrics.net</a>
          {' · '}
          <a href="https://github.com/nowi333/monerometrics" className="hover:underline" style={{ color: 'var(--color-info)' }}>GitHub</a>
        </p>
      </section>
    </div>
  )
}
