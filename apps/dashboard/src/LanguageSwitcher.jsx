import { useTranslation } from 'react-i18next'

const LANGS = ['en', 'fr', 'es']

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const currentLang = i18n.language.split('-')[0]

  return (
    <div className="flex gap-1 ml-auto">
      {LANGS.map((lng) => (
        <button
          key={lng}
          onClick={() => i18n.changeLanguage(lng)}
          className={`px-2 py-1 text-xs rounded font-mono transition-colors ${
            currentLang === lng
              ? 'bg-[color:var(--color-accent)] text-[color:var(--color-bg)]'
              : 'bg-[color:var(--color-card)] text-[color:var(--color-dim)] border border-[color:var(--color-border)] hover:text-[color:var(--color-text)]'
          }`}
        >
          {lng.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
