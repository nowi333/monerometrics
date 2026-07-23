import { useState, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'
import LanguageSwitcher from './LanguageSwitcher'
import KPICards from './KPICards'
import ChainForkVisualizer from './ChainForkVisualizer'
import BlocktimeChart from './BlocktimeChart'
import HashrateChart from './HashrateChart'
import MempoolChart from './MempoolChart'
import EmissionChart from './EmissionChart'
import PoolsDistribution from './PoolsDistribution'
import ReorgsStats from './ReorgsStats'
import OrphansTable from './OrphansTable'
import Donation from './Donation'
import Freshness from './Freshness'

const Documentation = lazy(() => import('./Documentation'))

const REPO_URL = 'https://github.com/nowi333/monerometrics'
const X_URL = ''
const MATRIX_URL = ''

const ONION_HOST = '6wbhchvavey26lbtscl6w6qg76balycixtsklcggrsslyk4xah6sbbad.onion'
const ONION_URL = `http://${ONION_HOST}`

const ICON_GITHUB = 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12'
const ICON_X = 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'
const ICON_MATRIX = 'M.632.55v22.9H2.28V24H0V0h2.28v.55zm7.043 7.26v1.157h.033c.309-.443.683-.784 1.117-1.024.433-.245.936-.365 1.5-.365.54 0 1.033.107 1.481.314.448.208.785.582 1.02 1.108.254-.374.6-.706 1.034-.992.434-.287.95-.43 1.546-.43.453 0 .872.056 1.26.167.388.11.716.286.993.53.276.245.489.559.646.951.152.392.23.863.23 1.417v5.728h-2.349V11.52c0-.286-.01-.559-.032-.812a1.755 1.755 0 0 0-.18-.66 1.106 1.106 0 0 0-.438-.448c-.194-.11-.457-.166-.785-.166-.332 0-.6.064-.803.189a1.38 1.38 0 0 0-.48.499 1.94 1.94 0 0 0-.231.696 5.56 5.56 0 0 0-.06.785v4.677h-2.35v-4.85c0-.254-.004-.503-.018-.752a2.074 2.074 0 0 0-.143-.688 1.052 1.052 0 0 0-.415-.503c-.194-.125-.476-.19-.854-.19-.111 0-.259.024-.439.074-.18.051-.36.143-.53.282-.171.138-.319.337-.439.595-.12.259-.18.6-.18 1.02v5.014H5.46V7.81zm15.693 15.64V.55H21.72V0H24v24h-2.28v-.55z'

export default function App() {
  const { t } = useTranslation()
  const [view, setView] = useState('dashboard')


  const goToDonation = () => {
    setView('dashboard')
    setTimeout(() => {
      document.getElementById('donation')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  return (
    <div className="min-h-screen p-3 sm:p-6 max-w-6xl mx-auto">
      <header
        className="mb-8 flex items-center justify-between pb-4 border-b gap-2 sm:gap-3"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <Logo onClick={() => { window.location.href = '/' }} />
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => setView(view === 'dashboard' ? 'docs' : 'dashboard')}
            title={view === 'dashboard' ? t('doc.nav') : t('doc.backToDashboard')}
            aria-label={view === 'dashboard' ? t('doc.nav') : t('doc.backToDashboard')}
            className="h-10 w-10 inline-flex items-center justify-center rounded-lg border hover:opacity-80 transition-opacity"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            {view === 'dashboard' ? (

              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z" />
                <path d="M14 2v6h6" />
                <path d="M8 13h8M8 17h8M8 9h2" />
              </svg>
            ) : (

              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <path d="M9 22V12h6v10" />
              </svg>
            )}
          </button>
          <button
            onClick={goToDonation}
            title={t('donate.help')}
            aria-label={t('donate.help')}
            className="mm-iridescent h-10 w-10 lg:w-auto lg:px-3 lg:gap-1.5 inline-flex items-center justify-center rounded-lg border hover:opacity-80 transition-opacity"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent)' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="shrink-0">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span className="hidden lg:inline text-sm font-medium whitespace-nowrap">{t('donate.help')}</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <MempoolChart />
        <EmissionChart />
      </div>

      <div className="mb-4">
        <PoolsDistribution />
      </div>

      <div className="mb-4">
        <ReorgsStats />
      </div>

      <div className="mb-4">
        <OrphansTable />
      </div>

      <Donation />
      </>}

      <footer
        className="mt-8 pt-4 border-t text-center text-xs"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-dim)' }}
      >
        <div className="flex items-center justify-center gap-4 mb-3">
          {[
            { url: REPO_URL, label: 'GitHub', soon: '', icon: ICON_GITHUB, size: 18 },
            { url: X_URL, label: 'X', soon: t('footer.xSoon'), icon: ICON_X, size: 16 },
            { url: MATRIX_URL, label: 'Matrix', soon: t('footer.matrixSoon'), icon: ICON_MATRIX, size: 17 },
          ].map(({ url, label, soon, icon, size }) => (
            url ? (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
                className="opacity-70 hover:opacity-100 transition-opacity"
                style={{ color: 'var(--color-text)' }}
              >
                <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{typeof icon === 'string' ? <path d={icon} /> : icon}</svg>
              </a>
            ) : (
              <span
                key={label}
                aria-label={`${label} (soon)`}
                title={soon}
                className="opacity-30 cursor-default"
                style={{ color: 'var(--color-text)' }}
              >
                <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{typeof icon === 'string' ? <path d={icon} /> : icon}</svg>
              </span>
            )
          ))}
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
        <Freshness />
        {}
        <div className="mt-1">
          <a
            className="hover:underline font-mono break-all"
            style={{ color: 'var(--color-purple)' }}
            href={ONION_URL}
            title={t('footer.tor')}
          >
            {ONION_HOST}
          </a>
        </div>
      </footer>
    </div>
  )
}
