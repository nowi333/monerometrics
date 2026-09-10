import { useTranslation } from 'react-i18next'
import { timeAgo } from './api'
import { poolColor } from './poolColors'

function Row({ label, children, mono }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3 py-1.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
      <span className="text-[11px] uppercase tracking-wide shrink-0 sm:w-36" style={{ color: 'var(--color-dim)' }}>{label}</span>
      <span className={`text-sm break-all${mono ? ' font-mono' : ''}`} style={{ color: 'var(--color-text)' }}>{children}</span>
    </div>
  )
}

/**
 * Ce qu'une transaction rend public, place sur la chaine que monerometrics
 * indexe : qui a mine son bloc, et si cette hauteur a deja ete contestee.
 * Rien sur les montants ni les parties, que le protocole chiffre.
 */
export default function TxResult({ tx, seenAt, onClose, onShowBlock }) {
  const { t } = useTranslation()
  const pending = tx.in_pool
  const conf = tx.confirmations ?? 0
  // L'instant de reference arrive du parent, capture a la reception de la
  // reponse : lire l'horloge pendant le rendu le rendrait instable.
  const ago = tx.block_timestamp && seenAt ? Math.floor(seenAt / 1000) - tx.block_timestamp : null
  const r = tx.reorg || {}
  const exposed = r.reorgs_touching > 0 || r.contested
  const reorgText = r.reorgs_touching > 0
    ? t('tx.reorgTouched', { n: r.reorgs_touching, d: r.max_reorg_depth ?? '—' })
    : r.contested ? t('tx.reorgContested') : t('tx.reorgClean')

  return (
    <div className="mb-3 rounded-lg border p-4" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded"
          style={{
            color: pending ? 'var(--color-warn)' : 'var(--color-success)',
            background: pending ? 'var(--color-warning-bg)' : 'var(--color-success-bg)',
            border: `1px solid ${pending ? 'var(--color-warning-border)' : 'var(--color-success-border)'}`,
          }}
        >{pending ? t('tx.pending') : t('tx.confirmed')}</span>
        <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{t('tx.title')}</span>
        <button
          onClick={onClose}
          aria-label={t('tx.close')}
          className="ml-auto opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--color-dim)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>

      <p className="text-xs font-mono break-all mb-2" style={{ color: 'var(--color-dim)' }}>{tx.tx_hash}</p>

      {tx.coinbase && <p className="text-xs mb-2" style={{ color: 'var(--color-info)' }}>{t('tx.coinbase')}</p>}
      {tx.double_spend_seen && <p className="text-xs mb-2" style={{ color: 'var(--color-danger)' }}>{t('tx.doubleSpend')}</p>}

      {!pending && (
        <Row label={t('tx.confirmations')} mono>
          {conf.toLocaleString()} ·{' '}
          <span style={{ color: tx.spendable ? 'var(--color-success)' : 'var(--color-warn)' }}>
            {tx.spendable ? t('tx.spendable') : t('tx.locked', { n: tx.lock_blocks })}
          </span>
        </Row>
      )}

      {!pending && tx.block_height != null && (
        <Row label={t('tx.block')}>
          <span className="inline-flex items-center gap-3 flex-wrap">
            <span className="font-mono">#{tx.block_height.toLocaleString()}</span>
            {ago != null && <span style={{ color: 'var(--color-dim)' }}>{timeAgo(ago)}</span>}
            <button onClick={() => onShowBlock(tx.block_height)} className="text-xs" style={{ color: 'var(--color-info)' }}>
              {t('tx.showBlock')}
            </button>
          </span>
        </Row>
      )}

      {!pending && (
        <Row label={t('tx.minedBy')}>
          <span className="inline-flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: poolColor(tx.miner_pool) }} />
            {tx.miner_pool || (tx.block_hash ? 'unknown' : t('tx.notIndexed'))}
          </span>
        </Row>
      )}

      {tx.fee_xmr && <Row label={t('tx.fee')} mono>{Number(tx.fee_xmr).toFixed(8)} XMR</Row>}
      {tx.size_bytes != null && <Row label={t('tx.size')} mono>{tx.size_bytes.toLocaleString()} B</Row>}
      <Row label={t('tx.io')} mono>
        {tx.input_count} · {tx.output_count}{tx.ring_size ? ` · ${t('tx.ring', { n: tx.ring_size })}` : ''}
      </Row>

      {!pending && (
        <Row label={t('tx.reorg')}>
          <span style={{ color: exposed ? 'var(--color-warn)' : 'var(--color-success)' }}>{reorgText}</span>
        </Row>
      )}

      <p className="text-[11px] mt-3" style={{ color: 'var(--color-dim)' }}>{t('tx.privacy')} {t('tx.onion')}</p>
    </div>
  )
}
