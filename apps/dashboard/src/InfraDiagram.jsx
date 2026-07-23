import { useTranslation } from 'react-i18next'

const ICONS = {
  visitor: <><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></>,
  cloudflare: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></>,
  edge: <><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><path d="M6 6h.01M6 18h.01" /></>,
  k3s: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="m3.3 7 8.7 5 8.7-5M12 22V12" /></>,
  monero: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></>,
  tor: <><circle cx="12" cy="13.5" r="7.5" /><circle cx="12" cy="13.5" r="3.8" /><path d="M12 6V2.5" /></>,
}

function NodeIcon({ name }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  )
}

function Node({ icon, title, sub }) {


  return (
    <div className="mm-node flex-1 min-w-[130px] rounded-xl border p-4 flex flex-col items-center justify-center text-center gap-2">
      <span className="mm-node-icon flex h-9 w-9 items-center justify-center rounded-full">
        <NodeIcon name={icon} />
      </span>
      <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{title}</span>
      <span className="text-[10px] font-mono leading-tight whitespace-pre-line" style={{ color: 'var(--color-dim)' }}>{sub}</span>
    </div>
  )
}

function Connector({ bidir }) {
  return (
    <div className="flex items-center justify-center shrink-0 py-1 lg:py-0 lg:px-0.5" style={{ color: 'var(--color-dim)' }} aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
        className="rotate-90 lg:rotate-0">
        {bidir
          ? <><path d="m8 3-4 4 4 4M4 7h16M16 21l4-4-4-4M20 17H4" /></>
          : <path d="m9 18 6-6-6-6" />}
      </svg>
    </div>
  )
}

export default function InfraDiagram() {
  const { t } = useTranslation()




  return (
    <div className="flex flex-col lg:flex-row lg:items-stretch">
      <Node icon="visitor" title={t('doc.infra.visitor')} sub={t('doc.infra.browser')} />
      <Connector />
      {}
      <div className="flex flex-1 min-w-[130px] flex-col gap-2">
        <Node icon="cloudflare" title="Cloudflare" sub={'DNS · WAF'} />
        <Node icon="tor" title="Tor" sub={t('doc.infra.hidden')} />
      </div>
      <Connector />
      <Node icon="edge" title="Edge" sub={'nginx + WAF'} />
      <Connector />
      <Node icon="k3s" title="k3s" sub={'monerod · worker\nPostgres · API'} />
      <Connector bidir />
      <Node icon="monero" title="Monero" sub={t('doc.infra.p2p')} />
    </div>
  )
}
