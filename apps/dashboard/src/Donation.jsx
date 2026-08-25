import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'

const XMR_DONATION_ADDRESS = '41mkUSrcAvdGw9E19a83rsh9zdSNC7m8PP34NvmRCCPLZVot61kJHc9i8KGge5JmxkDTuiz7a2nUtE7C4rcQJn4xKjfFyU2'
const INFRA_COST = 40
const REPO_URL = 'https://github.com/nowi333/monerometrics'
const ANONPAY_URL = `https://trocador.app/anonpay/?ticker_to=xmr&network_to=Mainnet&donation=True&name=${encodeURIComponent('monerometrics')}&description=${encodeURIComponent('Support monerometrics')}&buttonbgcolor=ff6600&address=${XMR_DONATION_ADDRESS}`
const ADDRESS_CONFIGURED =
  /^4[0-9AB][1-9A-HJ-NP-Za-km-z]{93}$/.test(XMR_DONATION_ADDRESS)

const HEART = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'

export default function Donation() {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const [payOpen, setPayOpen] = useState(false)

  useEffect(() => {
    if (!payOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setPayOpen(false) }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [payOpen])

  if (!ADDRESS_CONFIGURED) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(XMR_DONATION_ADDRESS)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { }
  }

  return (
    <div
      id="donation"
      className="mm-iridescent mm-iridescent-glow relative overflow-hidden rounded-xl border p-6 mb-4 scroll-mt-4"
      style={{
        background: 'color-mix(in srgb, var(--color-accent) 4%, var(--color-card))',
        borderColor: 'color-mix(in srgb, var(--color-accent) 28%, var(--color-border))',
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full"
        style={{ background: 'color-mix(in srgb, var(--color-accent) 18%, transparent)', filter: 'blur(48px)' }}
      />

      <div className="relative">
        <h3 className="text-lg font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--color-accent)" aria-hidden="true">
            <path d={HEART} />
          </svg>
          {t('donate.title')}
        </h3>
        <p className="text-sm mb-2 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {t('donate.body')}
        </p>
        <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {t('donate.cost', { cost: INFRA_COST })}{' '}
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: 'var(--color-info)' }}>
            {t('donate.costLink')}
          </a>
        </p>

        <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div
              className="rounded-xl p-3"
              style={{ background: '#fff', boxShadow: '0 6px 20px -6px color-mix(in srgb, var(--color-accent) 50%, transparent)' }}
            >
              <QRCodeSVG
                value={`monero:${XMR_DONATION_ADDRESS}`}
                size={132}
                level="M"
                fgColor="#1a1a1a"
                aria-label={t('donate.scan')}
              />
            </div>
            <span
              className="text-[10px] font-mono tracking-widest uppercase"
              style={{ color: 'var(--color-accent)' }}
            >
              {t('donate.scan')}
            </span>
          </div>

          <div className="flex-1 min-w-0 w-full">
            <div className="text-[11px] font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-dim)' }}>
              {t('donate.address')}
            </div>
            <button
              type="button"
              onClick={copy}
              title={t('donate.copy')}
              className="w-full rounded-lg border p-3 mb-3 flex items-center justify-between gap-3 text-left transition-all hover:brightness-110 active:scale-[0.99]"
              style={{
                background: 'color-mix(in srgb, var(--color-accent) 7%, var(--color-bg))',
                borderColor: 'color-mix(in srgb, var(--color-accent) 22%, var(--color-border))',
              }}
            >
              <code className="text-xs break-all leading-relaxed" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {XMR_DONATION_ADDRESS}
              </code>
              <span className="text-xs font-mono shrink-0" style={{ color: copied ? 'var(--color-success)' : 'var(--color-accent)' }}>
                {copied ? t('donate.copied') : t('donate.copy')}
              </span>
            </button>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setPayOpen(true)}
                className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ borderColor: 'color-mix(in srgb, var(--color-accent) 45%, var(--color-border))', color: 'var(--color-accent)' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v10M9 9.5a2.5 2.5 0 0 1 2.5-1.5h1a2 2 0 0 1 0 4h-1a2 2 0 0 0 0 4h1a2.5 2.5 0 0 0 2.5-1.5" />
                </svg>
                {t('donate.anyCoin')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {payOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('donate.anyCoin')}
          onClick={() => setPayOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', animation: 'mmFade 0.2s ease-out' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl border overflow-hidden shadow-2xl"
            style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', animation: 'mmPop 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{t('donate.anyCoin')}</span>
              <button
                onClick={() => setPayOpen(false)}
                aria-label={t('donate.close')}
                className="p-1 rounded transition-colors hover:brightness-125"
                style={{ color: 'var(--color-dim)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <iframe
              src={ANONPAY_URL}
              title="Trocador AnonPay"
              className="w-full block"
              style={{ height: 'min(340px, 80vh)', border: 0, colorScheme: 'normal' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
