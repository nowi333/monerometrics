import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Logo from './Logo'
import Documentation from './Documentation'
import ThemeToggle from './ThemeToggle'
import LanguageSwitcher from './LanguageSwitcher'
import KPICards from './KPICards'
import ChainForkVisualizer from './ChainForkVisualizer'
import BlocktimeChart from './BlocktimeChart'
import HashrateChart from './HashrateChart'
import PoolsDistribution from './PoolsDistribution'
import ReorgsStats from './ReorgsStats'
import OrphansTable from './OrphansTable'

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

      {view === 'docs' ? <Documentation /> : <>
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
