import { useState, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'
import LanguageSwitcher from './LanguageSwitcher'
import KPICards from './KPICards'
import ChainForkVisualizer from './ChainForkVisualizer'
import BlocktimeChart from './BlocktimeChart'
import HashrateChart from './HashrateChart'
import PoolsDistribution from './PoolsDistribution'
import ReorgsStats from './ReorgsStats'
import OrphansTable from './OrphansTable'
import Donation from './Donation'

// La page Documentation n'est affichee qu'a la demande : on la charge
// en lazy pour la sortir du bundle initial du dashboard.
const Documentation = lazy(() => import('./Documentation'))

// Liens sociaux. X_URL vide tant que le compte n'existe pas : l'icone
// s'affiche alors en grise, non cliquable (pas de lien mort).
const GITHUB_URL = 'https://github.com/nowi333/monerometrics'
const X_URL = ''

const ICON_GITHUB = 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12'
const ICON_X = 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'

export default function App() {
  const { t } = useTranslation()
  const [view, setView] = useState('dashboard')

  // Revient au dashboard (si besoin) puis defile jusqu'au widget de don.
  const goToDonation = () => {
    setView('dashboard')
    setTimeout(() => {
      document.getElementById('donation')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  return (
    <div className="min-h-screen p-3 sm:p-6 max-w-6xl mx-auto">
      <header
        className="mb-8 flex flex-wrap items-center justify-between pb-4 border-b gap-3"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <Logo onClick={() => { window.location.href = '/' }} />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView(view === 'dashboard' ? 'docs' : 'dashboard')}
            className="text-sm px-3 py-1 rounded border hover:opacity-80 transition-opacity"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            {view === 'dashboard' ? t('doc.nav') : t('doc.backToDashboard')}
          </button>
          <button
            onClick={goToDonation}
            title={t('donate.nav')}
            aria-label={t('donate.nav')}
            className="text-sm px-3 py-1 rounded border hover:opacity-80 transition-opacity flex items-center gap-1.5"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span className="hidden sm:inline">{t('donate.nav')}</span>
          </button>
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <div className="mb-6">
        <h2 className="text-lg font-medium mb-1" style={{ color: 'var(--color-text)' }}>
          {t('app.title')}
        </h2>
        <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
          {t('app.subtitle')}
        </p>
      </div>

      {view === 'docs' ? (
        <Suspense fallback={
          <div className="text-sm py-12 text-center" style={{ color: 'var(--color-dim)' }}>
            {t('state.loading')}
          </div>
        }>
          <Documentation />
        </Suspense>
      ) : <>
      <KPICards />

      <ChainForkVisualizer />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <HashrateChart />
        <BlocktimeChart />
      </div>

      <div className="mb-4">
        <PoolsDistribution />
      </div>

      <div className="mb-4">
        <ReorgsStats />
      </div>

      <OrphansTable />

      <Donation />
      </>}

      <footer
        className="mt-8 pt-4 border-t text-center text-xs"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-dim)' }}
      >
        <div className="flex items-center justify-center gap-4 mb-3">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            title="GitHub"
            className="opacity-70 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--color-text)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={ICON_GITHUB} /></svg>
          </a>
          {X_URL ? (
            <a
              href={X_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X"
              title="X"
              className="opacity-70 hover:opacity-100 transition-opacity"
              style={{ color: 'var(--color-text)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={ICON_X} /></svg>
            </a>
          ) : (
            <span
              aria-label="X (soon)"
              title={t('footer.xSoon')}
              className="opacity-30 cursor-default"
              style={{ color: 'var(--color-text)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={ICON_X} /></svg>
            </span>
          )}
        </div>
        {t('footer.apiLink')} :{' '}
        <a
          className="hover:underline"
          style={{ color: 'var(--color-info)' }}
          href="https://api.monerometrics.net/openapi.json"
        >
          api.monerometrics.net
        </a>
        {' · '}
        {t('footer.refresh')}
      </footer>
    </div>
  )
}
