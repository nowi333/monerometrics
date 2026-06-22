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
