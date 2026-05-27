import { useTranslation } from 'react-i18next'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'
import LanguageSwitcher from './LanguageSwitcher'
import KPICards from './KPICards'
import PoolsChart from './PoolsChart'
import ReorgsStats from './ReorgsStats'
import OrphansTable from './OrphansTable'

export default function App() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto">
      <header
        className="mb-8 flex items-center justify-between pb-4 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <Logo />
        <div className="flex items-center gap-2">
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

      <KPICards />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <PoolsChart />
        <ReorgsStats />
      </div>

      <OrphansTable />

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
