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
