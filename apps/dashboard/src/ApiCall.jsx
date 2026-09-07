import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const BASE = 'https://api.monerometrics.net'

/**
 * La commande exacte derriere le panneau affiche, copiable.
 *
 * Le projet affirme partout que ses chiffres sont reproductibles ; l'ecrire
 * dans un README ne le prouve pas, le rendre executable en un clic si.
 */
export default function ApiCall({ path }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  if (!path) return null

  const cmd = `curl -s "${BASE}${path}"`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cmd)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* presse-papier refuse */ }
  }

  return (
    <div className="mt-3 pt-3 border-t flex items-center gap-2 min-w-0"
      style={{ borderColor: 'var(--color-border)' }}>
      <code
        className="text-[10.5px] font-mono flex-1 min-w-0 truncate"
        style={{ color: 'var(--color-dim)' }}
        title={cmd}
      >{cmd}</code>
      <button
        onClick={copy}
        title={copied ? t('doc.tor.copied') : t('api.copyCall')}
        aria-label={copied ? t('doc.tor.copied') : t('api.copyCall')}
        className="shrink-0 text-[9.5px] font-mono rounded border px-2 py-1 hover:brightness-125 transition"
        style={{
          borderColor: 'var(--color-border)',
          color: copied ? 'var(--color-success)' : 'var(--color-dim)',
        }}
      >{copied ? t('doc.tor.copied') : t('doc.tor.copy')}</button>
    </div>
  )
}
