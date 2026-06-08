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
          'state.waitingSync': 'Waiting for monerod sync (worker indexing in progress)',
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

          // Documentation
          'doc.nav': 'Documentation',
          'doc.backToDashboard': 'Dashboard',
          'doc.aboutTitle': 'About monerometrics',
          'doc.aboutP1': 'monerometrics is a public dashboard that monitors the health of the Monero network. It focuses on a phenomenon that most block explorers surface poorly: chain reorganizations, where the network briefly rewrites its most recent history.',
          'doc.aboutP2': 'The project was born from the August 2025 Qubic episode, during which a mining pool approached a majority of the network hashrate and triggered reorganizations, raising concerns about the network resilience. The goal is to provide neutral, factual indicators instead of opinions.',
          'doc.aboutP3': 'All data is computed from a Monero node synchronized with the network, then indexed and exposed through a public API.',
          'doc.howTitle': 'How it works',
          'doc.howP1': 'The pipeline is intentionally simple, from the raw chain to the indicators you see here.',
          'doc.step1': 'A Monero node synchronized with the network, source of truth for the chain.',
          'doc.step2': 'A worker reads each block, computes indicators and detects reorganizations.',
          'doc.step3': 'Indicators and history are stored in a time-series database.',
          'doc.step4': 'A public API exposes everything as JSON, consumed by this dashboard.',
          'doc.apiTitle': 'Public API',
          'doc.apiP1': 'All endpoints are read-only and return JSON. Full OpenAPI schema:',
          'doc.ep.health': 'Liveness check and database connection status.',
          'doc.ep.info': 'Global metadata: latest indexed height, total blocks, orphans and reorgs.',
          'doc.ep.networkInfo': 'Current network state: sync status, mempool, difficulty and estimated hashrate (live from the node).',
          'doc.ep.networkHashrate': 'Historical network hashrate, bucketed by hour or day over the selected window.',
          'doc.ep.networkBlocktime': 'Variance of the time between consecutive canonical blocks (target is 120s).',
          'doc.ep.chainWindow': 'Raw block window between two heights (max 1000 blocks).',
          'doc.ep.chainForkWindow': 'Latest N blocks including orphans, with fork-point flags, for the chain visualizer.',
          'doc.ep.reorgs': 'List of the most recent detected reorganizations.',
          'doc.ep.reorgsStats': 'Reorg statistics aggregated over 24h, 7d and 30d windows.',
          'doc.ep.orphansRecent': 'Recent orphan blocks with their competing canonical block.',
          'doc.ep.poolsDistribution': 'Distribution of canonical blocks per mining pool over the window (decentralization measure).',
          'doc.fundingTitle': 'Support the project',
          'doc.fundingP1': 'monerometrics runs on a self-funded infrastructure.',

          // Info tooltips (explication + limite)
          'info.mempool': 'Number of unconfirmed transactions waiting in the node mempool. Reflects current pending demand on the network. Limit: live snapshot from the node, not a historical average.',
          'info.blocktime': 'Time elapsed between consecutive canonical blocks. Monero targets 120s; variance reflects hashrate fluctuations. Limit: per-block measurement, short windows only (up to 30d).',
          'info.pools': 'Share of canonical blocks mined per pool over the window, a decentralization indicator. Limit: pools are identified via their public APIs, so attribution is reliable only on recent windows; unidentified blocks (solo miners, untracked pools) appear as unknown.',
          'info.reorgs': 'Reorganizations are events where the chain replaces recently accepted blocks with a competing longer branch. Counted over 24h, 7d and 30d. Limit: only reorgs observed since this node started indexing are recorded.',
          'info.orphans': 'Orphan blocks are valid blocks that were replaced during a reorganization and left out of the canonical chain. Limit: shows the most recent orphans only, and depends on what this node observed.',
          'info.fork': 'Visual map of the latest blocks: the canonical chain and any orphan branches, color-coded by mining pool. Limit: shows a recent window of blocks, not the full history.',

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
          'state.waitingSync': 'En attente de synchronisation monerod (indexation worker en cours)',
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

          // Documentation
          'doc.nav': 'Documentation',
          'doc.backToDashboard': 'Tableau de bord',
          'doc.aboutTitle': 'A propos de monerometrics',
          'doc.aboutP1': 'monerometrics est un tableau de bord public qui surveille la sante du reseau Monero. Il se concentre sur un phenomene que la plupart des explorateurs montrent mal : les reorganisations de chaine, lorsque le reseau reecrit brievement son historique recent.',
          'doc.aboutP2': 'Le projet est ne de l episode Qubic d aout 2025, durant lequel un pool de minage a approche la majorite de la puissance de calcul du reseau et declenche des reorganisations, soulevant des questions sur la resilience du reseau. L objectif est de fournir des indicateurs neutres et factuels plutot que des opinions.',
          'doc.aboutP3': 'Toutes les donnees sont calculees depuis un noeud Monero synchronise avec le reseau, puis indexees et exposees via une API publique.',
          'doc.howTitle': 'Fonctionnement',
          'doc.howP1': 'La chaine de traitement est volontairement simple, de la blockchain brute jusqu aux indicateurs affiches ici.',
          'doc.step1': 'Un noeud Monero synchronise avec le reseau, source de verite de la chaine.',
          'doc.step2': 'Un worker lit chaque bloc, calcule les indicateurs et detecte les reorganisations.',
          'doc.step3': 'Les indicateurs et l historique sont stockes dans une base de series temporelles.',
          'doc.step4': 'Une API publique expose le tout en JSON, consomme par ce tableau de bord.',
          'doc.apiTitle': 'API publique',
          'doc.apiP1': 'Tous les endpoints sont en lecture seule et renvoient du JSON. Schema OpenAPI complet :',
          'doc.ep.health': 'Verification de disponibilite et etat de la connexion a la base.',
          'doc.ep.info': 'Metadonnees globales : derniere hauteur indexee, total des blocs, orphelins et reorgs.',
          'doc.ep.networkInfo': 'Etat actuel du reseau : synchronisation, mempool, difficulte et hashrate estime (en direct du noeud).',
          'doc.ep.networkHashrate': 'Hashrate historique du reseau, agrege par heure ou par jour sur la fenetre choisie.',
          'doc.ep.networkBlocktime': 'Variance du temps entre blocs canoniques consecutifs (cible de 120s).',
          'doc.ep.chainWindow': 'Fenetre de blocs bruts entre deux hauteurs (max 1000 blocs).',
          'doc.ep.chainForkWindow': 'Les N derniers blocs avec orphelins et marqueurs de fork, pour le visualiseur de chaine.',
          'doc.ep.reorgs': 'Liste des dernieres reorganisations detectees.',
          'doc.ep.reorgsStats': 'Statistiques de reorgs agregees sur 24h, 7j et 30j.',
          'doc.ep.orphansRecent': 'Blocs orphelins recents avec leur bloc canonique concurrent.',
          'doc.ep.poolsDistribution': 'Repartition des blocs canoniques par pool sur la fenetre (mesure de decentralisation).',
          'doc.fundingTitle': 'Soutenir le projet',
          'doc.fundingP1': 'monerometrics fonctionne sur une infrastructure autofinancee.',

          // Info tooltips (explication + limite)
          'info.mempool': 'Nombre de transactions non confirmees en attente dans le mempool du noeud. Reflete la demande en attente sur le reseau. Limite : instantane en direct du noeud, pas une moyenne historique.',
          'info.blocktime': 'Temps ecoule entre blocs canoniques consecutifs. Monero cible 120s ; la variance reflete les fluctuations de hashrate. Limite : mesure par bloc, fenetres courtes uniquement (jusqu a 30j).',
          'info.pools': 'Part des blocs canoniques mines par pool sur la fenetre, un indicateur de decentralisation. Limite : les pools sont identifies via leurs API publiques, donc l attribution est fiable seulement sur les fenetres recentes ; les blocs non identifies (mineurs solo, pools non suivis) apparaissent en unknown.',
          'info.reorgs': 'Les reorganisations sont des evenements ou la chaine remplace des blocs recemment acceptes par une branche concurrente plus longue. Comptees sur 24h, 7j et 30j. Limite : seules les reorgs observees depuis le demarrage de l indexation de ce noeud sont enregistrees.',
          'info.orphans': 'Les blocs orphelins sont des blocs valides remplaces lors d une reorganisation et exclus de la chaine canonique. Limite : affiche uniquement les orphelins les plus recents, et depend de ce que ce noeud a observe.',
          'info.fork': 'Carte visuelle des derniers blocs : la chaine canonique et les eventuelles branches orphelines, colorees par pool de minage. Limite : affiche une fenetre recente de blocs, pas tout l historique.',

          // Language switcher
          'lang.label': 'Langue',
        },
      },
    },
  })

export default i18n
