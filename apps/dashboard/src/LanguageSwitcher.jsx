import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
]

function Flag({ code, w = 20 }) {
  const h = Math.round(w * 0.7)
  const wrap = {
    width: w, height: h, borderRadius: 3, overflow: 'hidden',
    flexShrink: 0, display: 'inline-block', lineHeight: 0,
    boxShadow: '0 0 0 1px color-mix(in srgb, var(--color-text) 14%, transparent)',
  }
  let svg
  if (code === 'fr') {
    svg = (
      <svg viewBox="0 0 3 2" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">
        <rect x="0" width="1" height="2" fill="#0055A4" />
        <rect x="1" width="1" height="2" fill="#ffffff" />
        <rect x="2" width="1" height="2" fill="#EF4135" />
      </svg>
    )
  } else if (code === 'es') {
    svg = (
      <svg viewBox="0 0 3 2" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">
        <rect width="3" height="2" fill="#AA151B" />
        <rect y="0.5" width="3" height="1" fill="#F1BF00" />
      </svg>
    )
  } else {

    svg = (
      <svg viewBox="0 0 60 30" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="60" height="30" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#ffffff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" />
        <rect x="25" width="10" height="30" fill="#ffffff" />
        <rect y="10" width="60" height="10" fill="#ffffff" />
        <rect x="27" width="6" height="30" fill="#C8102E" />
        <rect y="12" width="60" height="6" fill="#C8102E" />
      </svg>
    )
  }
  return <span style={wrap}>{svg}</span>
}

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = i18n.language.split('-')[0]
  const active = LANGS.find(l => l.code === current) || LANGS[0]
  const [open, setOpen] = useState(false)
  const ref = useRef(null)


  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const select = (code) => { i18n.changeLanguage(code); setOpen(false) }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language"
        className="h-10 w-11 inline-flex items-center justify-center gap-1 rounded-lg border hover:opacity-80 transition-opacity"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
      >
        <Flag code={active.code} w={18} />
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
          style={{ color: 'var(--color-dim)' }}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 mt-2 z-50 min-w-[190px] rounded-xl border p-1.5 shadow-xl"
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', animation: 'mmPop 0.18s ease-out' }}
        >
          {LANGS.map(l => {
            const isActive = l.code === current
            return (
              <li key={l.code}>
                <button
                  role="option"
                  aria-selected={isActive}
                  onClick={() => select(l.code)}
                  className={`mm-lang-opt w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${isActive ? 'is-active' : ''}`}
                  style={{ color: 'var(--color-text)' }}
                >
                  <Flag code={l.code} w={22} />
                  <span className="flex-1 text-left font-medium">{l.label}</span>
                  {isActive && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
