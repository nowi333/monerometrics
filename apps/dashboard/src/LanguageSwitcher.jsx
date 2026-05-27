import { useTranslation } from 'react-i18next'

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const currentLang = i18n.language.split('-')[0]

  return (
    <div className="flex gap-1 ml-auto">
      <button
        onClick={() => i18n.changeLanguage('en')}
        className={`px-2 py-1 text-xs rounded font-mono transition-colors ${
          currentLang === 'en'
            ? 'bg-[color:var(--color-accent)] text-[color:var(--color-bg)]'
            : 'bg-[color:var(--color-card)] text-[color:var(--color-dim)] border border-[color:var(--color-border)] hover:text-[color:var(--color-text)]'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => i18n.changeLanguage('fr')}
        className={`px-2 py-1 text-xs rounded font-mono transition-colors ${
          currentLang === 'fr'
            ? 'bg-[color:var(--color-accent)] text-[color:var(--color-bg)]'
            : 'bg-[color:var(--color-card)] text-[color:var(--color-dim)] border border-[color:var(--color-border)] hover:text-[color:var(--color-text)]'
        }`}
      >
        FR
      </button>
    </div>
  )
}
