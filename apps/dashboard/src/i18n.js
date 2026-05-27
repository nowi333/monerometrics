import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: false,
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: {
        translation: {
          // Header
          'app.title': 'monerometrics',
          'app.subtitle': 'Public dashboard analyzing the Monero network · reorgs, mining pools, orphans',

          // KPI Cards
          'kpi.latestHeight': 'Latest indexed height',
          'kpi.totalBlocks': 'Total blocks indexed',
          'kpi.orphanBlocks': 'Orphan blocks',
          'kpi.reorgsDetected': 'Reorgs detected',

          // States
          'state.loading': 'Loading...',
          'state.loadingPools': 'Loading pool distribution...',
          'state.loadingReorgs': 'Loading reorgs stats...',
          'state.loadingOrphans': 'Loading orphans...',
          'state.apiError': 'API error',
          'state.noData': 'No data yet (worker waiting for monerod sync)',
          'state.noOrphans': 'No orphan blocks detected',

          // Pools chart
          'pools.title': 'Mining pools distribution',
          'pools.total': 'Total: {{count}} canonical blocks over window',
          'pools.window.24h': '24h',
          'pools.window.7d': '7d',
          'pools.window.30d': '30d',

          // Reorgs stats
          'reorgs.title': 'Detected reorgs statistics',
          'reorgs.column.window': 'Window',
          'reorgs.column.count': 'Count',
          'reorgs.column.avgDepth': 'Avg depth',
          'reorgs.column.maxDepth': 'Max depth',
          'reorgs.column.affectedTx': 'Affected tx',

          // Orphans table
          'orphans.title': 'Recent orphan blocks (max 20)',
          'orphans.column.height': 'Height',
          'orphans.column.orphanHash': 'Orphan hash',
          'orphans.column.canonicalHash': 'Canonical hash',
          'orphans.column.pool': 'Pool',
          'orphans.column.tx': 'Tx',

          // Footer
          'footer.apiLink': 'Public API',
          'footer.refresh': 'Data refreshed every 30 seconds',

          // Language switcher
          'lang.label': 'Language',
        },
      },
      fr: {
        translation: {
          // Header
          'app.title': 'monerometrics',
          'app.subtitle': 'Dashboard public d\'analyse du reseau Monero · reorgs, mining pools, orphans',

          // KPI Cards
          'kpi.latestHeight': 'Hauteur la plus recente',
          'kpi.totalBlocks': 'Total blocs indexes',
          'kpi.orphanBlocks': 'Blocs orphelins',
          'kpi.reorgsDetected': 'Reorgs detectes',

          // States
          'state.loading': 'Chargement...',
          'state.loadingPools': 'Chargement distribution pools...',
          'state.loadingReorgs': 'Chargement stats reorgs...',
          'state.loadingOrphans': 'Chargement orphelins...',
          'state.apiError': 'Erreur API',
          'state.noData': 'Aucune donnee (worker en attente sync monerod)',
          'state.noOrphans': 'Aucun bloc orphelin detecte',

          // Pools chart
          'pools.title': 'Distribution mining pools',
          'pools.total': 'Total : {{count}} blocs canoniques sur la fenetre',
          'pools.window.24h': '24h',
          'pools.window.7d': '7j',
          'pools.window.30d': '30j',

          // Reorgs stats
          'reorgs.title': 'Statistiques reorgs detectes',
          'reorgs.column.window': 'Fenetre',
          'reorgs.column.count': 'Count',
          'reorgs.column.avgDepth': 'Profondeur moyenne',
          'reorgs.column.maxDepth': 'Profondeur max',
          'reorgs.column.affectedTx': 'Tx affectees',

          // Orphans table
          'orphans.title': 'Derniers blocs orphelins (max 20)',
          'orphans.column.height': 'Hauteur',
          'orphans.column.orphanHash': 'Hash orphelin',
          'orphans.column.canonicalHash': 'Hash canonical',
          'orphans.column.pool': 'Pool',
          'orphans.column.tx': 'Tx',

          // Footer
          'footer.apiLink': 'API publique',
          'footer.refresh': 'Donnees mises a jour toutes les 30 secondes',

          // Language switcher
          'lang.label': 'Langue',
        },
      },
    },
  })

export default i18n
