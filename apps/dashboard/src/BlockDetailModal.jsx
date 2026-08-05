import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api, timeAgo } from './api'
import { poolColor } from './poolColors'
import { useModalDismiss } from './useModalDismiss'
import InfoTooltip from './InfoTooltip'

const EXPLORERS = [
  { name: 'xmrchain.net', url: (b, orphan) => `https://xmrchain.net/block/${orphan ? b.height : b.hash}` },
  { name: 'blockchair.com', url: (b) => `https://blockchair.com/monero/block/${b.height}` },
]

function Row({ label, tip, children, mono }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3 py-1.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
      <span className="text-[11px] uppercase tracking-wide shrink-0 sm:w-32 inline-flex items-center gap-1" style={{ color: 'var(--color-dim)' }}>
        {label}{tip && <InfoTooltip text={tip} />}
      </span>
      <span className={`text-sm break-all${mono ? ' font-mono' : ''}`} style={{ color: 'var(--color-text)' }}>{children}</span>
    </div>
  )
}

export default function BlockDetailModal({ selected, onClose }) {
  const { t } = useTranslation()
  const [rich, setRich] = useState(null)
  const [copied, setCopied] = useState(false)
  const open = !!selected
  useModalDismiss(open, onClose)

  const block = selected?.block

  useEffect(() => {
    if (!block) return
    let alive = true



    api.blockDetail(block.hash)
      .then(d => {
        if (!alive) return
        const ts = block.timestamp_unix ?? d?.timestamp_unix ?? null
        const ago = ts ? Math.floor(Date.now() / 1000) - ts : null
        setRich({ hash: block.hash, data: d, ts, ago })
      })
      .catch(() => { if (alive) setRich({ hash: block.hash, data: null, ts: block.timestamp_unix ?? null, ago: null }) })
    return () => { alive = false }
  }, [block])

  if (!open) return null

  const isOrphan = selected.isOrphan

  const richRow = rich && rich.hash === block.hash ? rich : null
  const ext = richRow?.data ?? null
  const src = block.pool_source || ext?.pool_source || null
  const copyHash = async () => {
    try { await navigator.clipboard.writeText(block.hash); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { }
  }

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="block-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', animation: 'mmFade 0.2s ease-out' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-lg max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border p-5 sm:p-6 shadow-2xl"
        style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', animation: 'mmPop 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        <button
          onClick={onClose} aria-label="Close"
          className="absolute top-3 right-3 opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--color-dim)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>

        <div className="flex items-center gap-2 mb-4 pr-8">
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded inline-flex items-center gap-1"
            style={{
              color: isOrphan ? 'var(--color-danger)' : 'var(--color-success)',
              background: isOrphan ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
              border: `1px solid ${isOrphan ? 'var(--color-danger-border)' : 'var(--color-success-border)'}`,
            }}
          >
            {isOrphan ? t('fork.orphanBlock') : t('fork.canonicalBlock')}
            <InfoTooltip text={t('block.tip.status')} />
          </span>
          {block.is_fork_point && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded inline-flex items-center gap-1" style={{ color: 'var(--color-warn)', background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)' }}>
              {t('block.forkPoint')}
              <InfoTooltip text={t('block.tip.forkPoint')} />
            </span>
          )}
          <h2 id="block-modal-title" className="text-lg font-medium ml-auto font-mono" style={{ color: 'var(--color-text)' }}>#{block.height.toLocaleString()}</h2>
        </div>

        <div className="mb-4">
          <Row label={t('fork.tipHash')} mono>
            <span className="inline-flex items-start gap-2">
              <span>{block.hash}</span>
              <button onClick={copyHash} title={t('doc.tor.copy')} className="shrink-0 text-xs" style={{ color: copied ? 'var(--color-success)' : 'var(--color-info)' }}>
                {copied ? t('doc.tor.copied') : t('doc.tor.copy')}
              </button>
            </span>
          </Row>
          {(block.prev_hash || ext?.prev_hash) && <Row label={t('block.prevHash')} mono>{block.prev_hash || ext.prev_hash}</Row>}
          <Row label={t('fork.tipPool')} tip={t('block.tip.pool')}>
            <span className="inline-flex items-center gap-2 flex-wrap">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: poolColor(block.miner_pool) }} />
              {block.miner_pool || 'unknown'}
              {src && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded border"
                  title={t('block.source.' + src + 'Help')}
                  style={{
                    color: src === 'viewkey_proof' ? 'var(--color-success)' : 'var(--color-dim)',
                    borderColor: src === 'viewkey_proof' ? 'var(--color-success-border)' : 'var(--color-border)',
                    background: src === 'viewkey_proof' ? 'var(--color-success-bg)' : 'transparent',
                  }}
                >
                  {t('block.source.' + src)}
                </span>
              )}
            </span>
          </Row>
          <Row label={t('fork.tipTx')} tip={t('block.tip.txCount')} mono>{block.tx_count ?? ext?.tx_count ?? '—'}</Row>
          {ext?.size_bytes != null && <Row label={t('block.size')} tip={t('block.tip.size')} mono>{ext.size_bytes.toLocaleString()} B</Row>}
          {ext?.difficulty != null && <Row label={t('block.difficulty')} tip={t('block.tip.difficulty')} mono>{Number(ext.difficulty).toLocaleString()}</Row>}
          {ext?.reward_xmr != null && <Row label={t('block.reward')} mono>{Number(ext.reward_xmr).toFixed(6)} XMR</Row>}
          <Row label={t('fork.tipTime')} mono>
            {(() => {
              const ts = block.timestamp_unix ?? richRow?.ts ?? null
              if (!ts) return '—'
              const ago = block.timestamp_unix ? selected.agoSeconds : richRow?.ago
              return `${new Date(ts * 1000).toISOString().replace('T', ' ').slice(0, 19)} UTC · ${ago != null ? timeAgo(ago) : ''}`.trim()
            })()}
          </Row>
          {ext?.weight != null && (
            <Row label={t('block.weight')} tip={t('block.tip.weight')} mono>
              {ext.weight.toLocaleString()}
              {ext.long_term_weight != null && ext.long_term_weight !== ext.weight
                ? ` (${t('block.longTerm')} ${ext.long_term_weight.toLocaleString()})` : ''}
            </Row>
          )}
          {ext?.coinbase_hash && <Row label={t('block.coinbase')} tip={t('block.tip.coinbase')} mono>{ext.coinbase_hash}</Row>}
          {ext?.merge_mining?.length > 0 && (
            <Row label={t('block.mergeMining')} tip={t('block.tip.mergeMining')}>
              <span className="flex flex-col gap-1">
                <span>
                  {t('block.mergeMiningValue', { count: ext.merge_mining.length })}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--color-dim)' }}>
                  {t('block.mergeChainGuess')}
                </span>
                {ext.merge_mining.map((c, i) => c.id ? (
                  <span key={i} className="text-[10px] font-mono break-all" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('block.mergeMerkle')}: {c.id}
                  </span>
                ) : null)}
              </span>
            </Row>
          )}
        </div>

        {ext?.tx_hashes?.length > 0 && (
          <details className="mb-4">
            <summary className="text-[11px] uppercase tracking-wide cursor-pointer inline-flex items-center gap-1" style={{ color: 'var(--color-dim)' }}>
              {t('block.txList', { count: ext.tx_hashes.length })}
              <InfoTooltip text={t('block.tip.txList')} />
            </summary>
            <div className="mt-2 max-h-40 overflow-y-auto text-[10px] font-mono break-all space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
              {ext.tx_hashes.map(h => <div key={h}>{h}</div>)}
            </div>
          </details>
        )}

        <div>
          <div className="text-[11px] uppercase tracking-wide mb-2 inline-flex items-center gap-1" style={{ color: 'var(--color-dim)' }}>
            {t('block.verify')}
            <InfoTooltip text={t('block.tip.explorers')} />
          </div>
          <div className="flex flex-wrap gap-2">
            {EXPLORERS.map(ex => (
              <a
                key={ex.name}
                href={ex.url(block, isOrphan)}
                target="_blank" rel="noopener noreferrer"
                className="mm-node text-xs rounded border px-3 py-1.5 inline-flex items-center gap-1.5"
                style={{ color: 'var(--color-text)' }}
              >
                {ex.name}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6M10 14 21 3" /></svg>
              </a>
            ))}
          </div>
          {isOrphan && (
            <p className="text-[11px] mt-2 leading-relaxed" style={{ color: 'var(--color-dim)' }}>{t('block.orphanNote')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
