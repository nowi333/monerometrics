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
          // Charts
          'charts.hashrateTitle': 'Network hashrate',
          'charts.hashrate': 'Hashrate',
          'charts.blocktimeTitle': 'Block time variance',
          'charts.blocktime': 'Block time',
          'charts.target': 'Target (120s)',
          'charts.blocktimeStats': 'avg {{avg}}s · median {{median}}s',
          // Top pools table
          'toppools.title': 'Top mining pools',
          'toppools.poolsUnit': 'pools',
          'toppools.poolsUnit': 'pools',
          'toppools.pool': 'Pool',
          'toppools.blocks': 'Blocks',
          'toppools.share': 'Share',
          'toppools.distribution': 'Distribution',
          'toppools.total': 'Total: {{count}} canonical blocks',

          // Fork visualizer
          'fork.title': 'Chain fork visualizer',
          'fork.canonical': 'Canonical chain',
          'fork.orphans': 'Orphan blocks',
          'fork.canonicalBlock': 'Canonical block',
          'fork.orphanBlock': 'Orphan block',
          'fork.stats': '{{blocks}} blocks · {{reorgs}} reorgs detected',
          'fork.mockNotice': 'Demo data (worker indexing once monerod sync completes)',
          'fork.zoomIn': 'Zoom in',
          'fork.zoomOut': 'Zoom out',
          'fork.reset': 'Reset view',
          'fork.fullscreen': 'Fullscreen',
          'fork.tipHeight': 'Height',
          'fork.tipHash': 'Hash',
          'fork.tipPool': 'Pool',
          'fork.tipTx': 'Tx count',
          'fork.tipTime': 'Mined',

          // Status pill
          'status.connecting': 'Connecting...',
          'status.syncing': 'syncing',
          'status.synced': 'synced',
          'status.block': 'block',

          // KPI Cards refactor
          'kpi.blockHeight': 'Block height',
          'kpi.networkHashrate': 'Network hashrate',
          'kpi.mempool': 'Mempool',
          'kpi.reorgWatcher': 'Reorg watcher',
          'kpi.txs': 'txs',
          'kpi.events': 'events',
          'kpi.pending': 'pending',
          'kpi.maxDepth': 'max depth',
          'kpi.noReorg': 'no reorg detected',
          'kpi.targetBlocktime': 'target 120s/block',

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
          // Charts
          'charts.hashrateTitle': 'Hashrate reseau',
          'charts.hashrate': 'Hashrate',
          'charts.blocktimeTitle': 'Variance temps de bloc',
          'charts.blocktime': 'Temps de bloc',
          'charts.target': 'Cible (120s)',
          'charts.blocktimeStats': 'moy {{avg}}s · mediane {{median}}s',
          // Top pools table
          'toppools.title': 'Top mining pools',
          'toppools.pool': 'Pool',
          'toppools.blocks': 'Blocs',
          'toppools.share': 'Part',
          'toppools.distribution': 'Distribution',
          'toppools.total': 'Total : {{count}} blocs canoniques',

          // Fork visualizer
          'fork.title': 'Visualiseur de forks',
          'fork.canonical': 'Chaine canonique',
          'fork.orphans': 'Blocs orphelins',
          'fork.canonicalBlock': 'Bloc canonique',
          'fork.orphanBlock': 'Bloc orphelin',
          'fork.stats': '{{blocks}} blocs · {{reorgs}} reorgs detectes',
          'fork.mockNotice': 'Donnees demo (indexation des que monerod est synchronise)',
          'fork.zoomIn': 'Zoom avant',
          'fork.zoomOut': 'Zoom arriere',
          'fork.reset': 'Reinitialiser la vue',
          'fork.fullscreen': 'Plein ecran',
          'fork.tipHeight': 'Hauteur',
          'fork.tipHash': 'Hash',
          'fork.tipPool': 'Pool',
          'fork.tipTx': 'Nb tx',
          'fork.tipTime': 'Mine',

          // Status pill
          'status.connecting': 'Connexion...',
          'status.syncing': 'sync en cours',
          'status.synced': 'synchronise',
          'status.block': 'bloc',

          // KPI Cards refactor
          'kpi.blockHeight': 'Hauteur bloc',
          'kpi.networkHashrate': 'Hashrate reseau',
          'kpi.mempool': 'Mempool',
          'kpi.reorgWatcher': 'Detection reorgs',
          'kpi.txs': 'txs',
          'kpi.events': 'events',
          'kpi.pending': 'en attente',
          'kpi.maxDepth': 'profondeur max',
          'kpi.noReorg': 'aucun reorg detecte',
          'kpi.targetBlocktime': 'cible 120s/bloc',

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
