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
      className="rounded-lg border p-6 mb-4 scroll-mt-4"
      style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
    >
      <h3 className="text-base font-medium mb-2" style={{ color: 'var(--color-text)' }}>
        {t('donate.title')}
      </h3>
      <p className="text-xs mb-4" style={{ color: 'var(--color-dim)', maxWidth: '52ch' }}>
        {t('donate.body')}
      </p>

      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div className="rounded-md p-2" style={{ background: '#fff' }}>
          <QRCodeSVG
            value={`monero:${XMR_DONATION_ADDRESS}`}
            size={128}
            level="M"
            aria-label={t('donate.scan')}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-xs mb-1" style={{ color: 'var(--color-dim)' }}>
            {t('donate.address')}
          </div>
          <code
            className="block text-xs break-all p-2 rounded mb-2"
            style={{
              background: 'var(--color-bg)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-mono)',
              border: '1px solid var(--color-border)',
            }}
          >
            {XMR_DONATION_ADDRESS}
          </code>
          <button
            onClick={copy}
            className="text-xs px-3 py-1 rounded border hover:opacity-80 transition-opacity"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            {copied ? t('donate.copied') : t('donate.copy')}
          </button>
        </div>
      </div>
    </div>
  )
}
