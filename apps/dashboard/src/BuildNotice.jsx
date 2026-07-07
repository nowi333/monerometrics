import { useState } from 'react'

// Bandeau "site en construction" affiche au chargement. Volontairement en
// anglais (audience Monero majoritairement anglophone). Dismiss memorise en
// localStorage pour ne pas reapparaitre a chaque visite.
const DISMISS_KEY = 'mm_build_notice_dismissed'

export default function BuildNotice() {
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) !== '1' } catch { return true }
  })

  if (!open) return null

  const close = () => {
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* stockage indispo : on ferme quand meme */ }
    setOpen(false)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="build-notice-title"
      onClick={close}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', animation: 'mmFade 0.2s ease-out' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl border p-6 text-center shadow-2xl"
        style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', animation: 'mmPop 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        <button
          onClick={close}
          aria-label="Close"
          className="absolute top-3 right-3 opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--color-dim)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Icone travaux (casque de chantier) sur pastille accent */}
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)', color: 'var(--color-accent)' }}
        >
          <svg className="animate-pulse" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 18a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h20a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1Z" />
            <path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" />
            <path d="M4 15v-3a6 6 0 0 1 6-6" />
            <path d="M14 6a6 6 0 0 1 6 6v3" />
          </svg>
        </div>

        <h2 id="build-notice-title" className="mb-2 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          This site is still being built
        </h2>
        <p className="mb-5 text-sm leading-relaxed" style={{ color: 'var(--color-dim)' }}>
          monerometrics is live but still syncing the Monero blockchain. Some
          charts and historical data will keep filling in over the next few
          hours. Thanks for your patience!
        </p>

        <button
          onClick={close}
          className="w-full rounded-lg py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--color-accent)' }}
        >
          Got it
        </button>
      </div>
    </div>
  )
}
