import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'

// ============================================================
// Adresse Monero de don.
// Remplacer le placeholder par l'adresse reelle avant le deploiement.
// Tant que la valeur reste le placeholder, le widget ne s'affiche PAS
// (aucune fausse donnee a l'ecran : meme principe d'integrite que le reste).
// ============================================================
const XMR_DONATION_ADDRESS = '41mkUSrcAvdGw9E19a83rsh9zdSNC7m8PP34NvmRCCPLZVot61kJHc9i8KGge5JmxkDTuiz7a2nUtE7C4rcQJn4xKjfFyU2'
const ADDRESS_CONFIGURED =
  /^4[0-9AB][1-9A-HJ-NP-Za-km-z]{93}$/.test(XMR_DONATION_ADDRESS)

const HEART = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'

export default function Donation() {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  if (!ADDRESS_CONFIGURED) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(XMR_DONATION_ADDRESS)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard indisponible (http, permissions) : on ne fait rien de plus
    }
  }

  return (
    <div
      id="donation"
      className="relative overflow-hidden rounded-xl border p-6 mb-4 scroll-mt-4"
      style={{
        background: 'color-mix(in srgb, var(--color-accent) 4%, var(--color-card))',
        borderColor: 'color-mix(in srgb, var(--color-accent) 28%, var(--color-border))',
      }}
    >
      {/* Halo accent discret en haut a droite */}
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
        <p className="text-xs mb-5 leading-relaxed" style={{ color: 'var(--color-dim)', maxWidth: '56ch' }}>
          {t('donate.body')}
        </p>

        <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
          {/* QR code dans une carte blanche avec ombre + caption XMR */}
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

          {/* Adresse + copie */}
          <div className="flex-1 min-w-0 w-full">
            <div className="text-[11px] font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-dim)' }}>
              {t('donate.address')}
            </div>
            <code
              className="block text-xs break-all p-3 rounded-lg mb-3 leading-relaxed"
              style={{
                background: 'color-mix(in srgb, var(--color-accent) 7%, var(--color-bg))',
                color: 'var(--color-text-secondary)',
                fontFamily: 'var(--font-mono)',
                border: '1px solid color-mix(in srgb, var(--color-accent) 22%, var(--color-border))',
              }}
            >
              {XMR_DONATION_ADDRESS}
            </code>
            <button
              onClick={copy}
              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-all hover:brightness-110 active:scale-[0.98]"
              style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
            >
              {copied ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
              {copied ? t('donate.copied') : t('donate.copy')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
