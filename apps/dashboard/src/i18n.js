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
          'charts.mempoolTitle': 'Mempool',
          'charts.emissionTitle': 'Block reward (emission)',
          // Top pools table
          'toppools.title': 'Top mining pools',
          'toppools.poolsUnit': 'pools',
          'toppools.pool': 'Pool',
          'toppools.blocks': 'Blocks',
          'toppools.share': 'Share',
          'toppools.distribution': 'Distribution',
          'toppools.total': 'Total: {{count}} canonical blocks',
          'toppools.topPool': 'Largest pool',
          'toppools.nakamoto': 'Nakamoto coefficient',
          'toppools.nakamotoUnit': 'pools',

          // Fork visualizer
          'fork.title': 'Chain fork visualizer',
          'fork.canonical': 'Canonical chain',
          'fork.orphans': 'Orphan blocks',
          'fork.canonicalBlock': 'Canonical block',
          'fork.orphanBlock': 'Orphan block',
          'fork.stats': '{{blocks}} blocks · {{reorgs}} reorgs detected',
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
          'footer.xSoon': 'X — coming soon',

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
          'doc.ep.networkMempool': 'Mempool size (pending transactions) over time, sampled by the worker on each poll.',
          'doc.ep.networkEmission': 'Average block reward over time — shows Monero tail emission (~0.6 XMR per block).',
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
          'info.nakamoto': 'Minimum number of mining pools that together control more than 50% of recently mined blocks (identified pools only, excluding solo/unknown). Lower means more centralized — a single pool above 50% is the 51% risk.',
          'info.reorgs': 'Reorganizations are events where the chain replaces recently accepted blocks with a competing longer branch. Counted over 24h, 7d and 30d. Limit: only reorgs observed since this node started indexing are recorded.',
          'info.orphans': 'Orphan blocks are valid blocks that were replaced during a reorganization and left out of the canonical chain. Limit: shows the most recent orphans only, and depends on what this node observed.',
          'info.fork': 'Visual map of the latest blocks: the canonical chain and any orphan branches, color-coded by mining pool. Limit: shows a recent window of blocks, not the full history.',

          // Donation
          'donate.nav': 'Donate',
          'donate.title': 'Support monerometrics',
          'donate.body': 'monerometrics is open-source and self-funded, with no ads and no tracking. If it is useful to you, a Monero donation helps cover the infrastructure costs and keeps the public dashboard and API free.',
          'donate.address': 'Monero address',
          'donate.copy': 'Copy address',
          'donate.copied': 'Copied!',
          'donate.scan': 'Scan to donate',

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
          'charts.mempoolTitle': 'Mempool',
          'charts.emissionTitle': 'Recompense de bloc (emission)',
          // Top pools table
          'toppools.title': 'Top mining pools',
          'toppools.pool': 'Pool',
          'toppools.blocks': 'Blocs',
          'toppools.share': 'Part',
          'toppools.distribution': 'Distribution',
          'toppools.total': 'Total : {{count}} blocs canoniques',
          'toppools.topPool': 'Plus gros pool',
          'toppools.nakamoto': 'Coefficient de Nakamoto',
          'toppools.nakamotoUnit': 'pools',

          // Fork visualizer
          'fork.title': 'Visualiseur de forks',
          'fork.canonical': 'Chaine canonique',
          'fork.orphans': 'Blocs orphelins',
          'fork.canonicalBlock': 'Bloc canonique',
          'fork.orphanBlock': 'Bloc orphelin',
          'fork.stats': '{{blocks}} blocs · {{reorgs}} reorgs detectes',
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
          'footer.xSoon': 'X — bientot',

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
          'doc.ep.networkMempool': 'Taille du mempool (transactions en attente) dans le temps, echantillonnee a chaque poll du worker.',
          'doc.ep.networkEmission': 'Recompense de bloc moyenne dans le temps — montre la tail emission de Monero (~0,6 XMR par bloc).',
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
          'info.nakamoto': 'Nombre minimal de pools de minage qui controlent ensemble plus de 50% des blocs recents (pools identifies seulement, hors solo/unknown). Plus il est bas, plus c est centralise — un seul pool au-dessus de 50% est le risque des 51%.',
          'info.reorgs': 'Les reorganisations sont des evenements ou la chaine remplace des blocs recemment acceptes par une branche concurrente plus longue. Comptees sur 24h, 7j et 30j. Limite : seules les reorgs observees depuis le demarrage de l indexation de ce noeud sont enregistrees.',
          'info.orphans': 'Les blocs orphelins sont des blocs valides remplaces lors d une reorganisation et exclus de la chaine canonique. Limite : affiche uniquement les orphelins les plus recents, et depend de ce que ce noeud a observe.',
          'info.fork': 'Carte visuelle des derniers blocs : la chaine canonique et les eventuelles branches orphelines, colorees par pool de minage. Limite : affiche une fenetre recente de blocs, pas tout l historique.',

          // Donation
          'donate.nav': 'Faire un don',
          'donate.title': 'Soutenir monerometrics',
          'donate.body': 'monerometrics est open-source et autofinance, sans publicite ni tracage. Si le projet vous est utile, un don en Monero aide a couvrir les couts d infrastructure et garde le tableau de bord et l API publics gratuits.',
          'donate.address': 'Adresse Monero',
          'donate.copy': 'Copier l adresse',
          'donate.copied': 'Copie !',
          'donate.scan': 'Scanner pour faire un don',

          // Language switcher
          'lang.label': 'Langue',
        },
      },
      es: {
        translation: {
          // Charts
          'charts.hashrateTitle': 'Hashrate de la red',
          'charts.hashrate': 'Hashrate',
          'charts.blocktimeTitle': 'Varianza del tiempo de bloque',
          'charts.blocktime': 'Tiempo de bloque',
          'charts.target': 'Objetivo (120s)',
          'charts.blocktimeStats': 'prom {{avg}}s · mediana {{median}}s',
          'charts.mempoolTitle': 'Mempool',
          'charts.emissionTitle': 'Recompensa de bloque (emision)',
          // Top pools table
          'toppools.title': 'Principales pools de mineria',
          'toppools.poolsUnit': 'pools',
          'toppools.pool': 'Pool',
          'toppools.blocks': 'Bloques',
          'toppools.share': 'Cuota',
          'toppools.distribution': 'Distribucion',
          'toppools.total': 'Total: {{count}} bloques canonicos',
          'toppools.topPool': 'Pool mas grande',
          'toppools.nakamoto': 'Coeficiente de Nakamoto',
          'toppools.nakamotoUnit': 'pools',

          // Fork visualizer
          'fork.title': 'Visualizador de forks',
          'fork.canonical': 'Cadena canonica',
          'fork.orphans': 'Bloques huerfanos',
          'fork.canonicalBlock': 'Bloque canonico',
          'fork.orphanBlock': 'Bloque huerfano',
          'fork.stats': '{{blocks}} bloques · {{reorgs}} reorgs detectadas',
          'fork.zoomIn': 'Acercar',
          'fork.zoomOut': 'Alejar',
          'fork.reset': 'Restablecer vista',
          'fork.fullscreen': 'Pantalla completa',
          'fork.tipHeight': 'Altura',
          'fork.tipHash': 'Hash',
          'fork.tipPool': 'Pool',
          'fork.tipTx': 'Nro tx',
          'fork.tipTime': 'Minado',

          // Status pill
          'status.connecting': 'Conectando...',
          'status.syncing': 'sincronizando',
          'status.synced': 'sincronizado',
          'status.block': 'bloque',

          // KPI Cards refactor
          'kpi.blockHeight': 'Altura de bloque',
          'kpi.networkHashrate': 'Hashrate de la red',
          'kpi.mempool': 'Mempool',
          'kpi.reorgWatcher': 'Monitor de reorgs',
          'kpi.txs': 'txs',
          'kpi.events': 'eventos',
          'kpi.pending': 'pendientes',
          'kpi.maxDepth': 'profundidad max',
          'kpi.noReorg': 'ninguna reorg detectada',
          'kpi.targetBlocktime': 'objetivo 120s/bloque',

          // Header
          'app.title': 'monerometrics',
          'app.subtitle': 'Panel publico de analisis de la red Monero · reorgs, pools de mineria, huerfanos',

          // KPI Cards
          'kpi.latestHeight': 'Altura mas reciente indexada',
          'kpi.totalBlocks': 'Total de bloques indexados',
          'kpi.orphanBlocks': 'Bloques huerfanos',
          'kpi.reorgsDetected': 'Reorgs detectadas',

          // States
          'state.loading': 'Cargando...',
          'state.loadingPools': 'Cargando distribucion de pools...',
          'state.loadingReorgs': 'Cargando estadisticas de reorgs...',
          'state.loadingOrphans': 'Cargando huerfanos...',
          'state.apiError': 'Error de API',
          'state.waitingSync': 'Esperando la sincronizacion de monerod (indexacion del worker en curso)',
          'state.noData': 'Aun no hay datos (worker esperando la sincronizacion de monerod)',
          'state.noOrphans': 'No se detectaron bloques huerfanos',

          // Pools chart
          'pools.title': 'Distribucion de pools de mineria',
          'pools.total': 'Total: {{count}} bloques canonicos en la ventana',
          'pools.window.24h': '24h',
          'pools.window.7d': '7d',
          'pools.window.30d': '30d',

          // Reorgs stats
          'reorgs.title': 'Estadisticas de reorgs detectadas',
          'reorgs.column.window': 'Ventana',
          'reorgs.column.count': 'Cantidad',
          'reorgs.column.avgDepth': 'Profundidad media',
          'reorgs.column.maxDepth': 'Profundidad max',
          'reorgs.column.affectedTx': 'Tx afectadas',

          // Orphans table
          'orphans.title': 'Ultimos bloques huerfanos (max 20)',
          'orphans.column.height': 'Altura',
          'orphans.column.orphanHash': 'Hash huerfano',
          'orphans.column.canonicalHash': 'Hash canonico',
          'orphans.column.pool': 'Pool',
          'orphans.column.tx': 'Tx',

          // Footer
          'footer.apiLink': 'API publica',
          'footer.refresh': 'Datos actualizados cada 30 segundos',
          'footer.xSoon': 'X — proximamente',

          // Documentation
          'doc.nav': 'Documentacion',
          'doc.backToDashboard': 'Panel',
          'doc.aboutTitle': 'Acerca de monerometrics',
          'doc.aboutP1': 'monerometrics es un panel publico que monitorea la salud de la red Monero. Se centra en un fenomeno que la mayoria de los exploradores de bloques muestran mal: las reorganizaciones de cadena, cuando la red reescribe brevemente su historia mas reciente.',
          'doc.aboutP2': 'El proyecto nacio del episodio Qubic de agosto de 2025, durante el cual un pool de mineria se acerco a la mayoria del hashrate de la red y provoco reorganizaciones, generando preocupacion sobre la resiliencia de la red. El objetivo es ofrecer indicadores neutrales y factuales en lugar de opiniones.',
          'doc.aboutP3': 'Todos los datos se calculan a partir de un nodo Monero sincronizado con la red, luego se indexan y se exponen a traves de una API publica.',
          'doc.howTitle': 'Como funciona',
          'doc.howP1': 'El proceso es intencionalmente simple, desde la cadena en bruto hasta los indicadores que ves aqui.',
          'doc.step1': 'Un nodo Monero sincronizado con la red, fuente de verdad de la cadena.',
          'doc.step2': 'Un worker lee cada bloque, calcula indicadores y detecta reorganizaciones.',
          'doc.step3': 'Los indicadores y el historial se almacenan en una base de datos de series temporales.',
          'doc.step4': 'Una API publica lo expone todo en JSON, consumido por este panel.',
          'doc.apiTitle': 'API publica',
          'doc.apiP1': 'Todos los endpoints son de solo lectura y devuelven JSON. Esquema OpenAPI completo:',
          'doc.ep.health': 'Verificacion de disponibilidad y estado de la conexion a la base de datos.',
          'doc.ep.info': 'Metadatos globales: ultima altura indexada, total de bloques, huerfanos y reorgs.',
          'doc.ep.networkInfo': 'Estado actual de la red: sincronizacion, mempool, dificultad y hashrate estimado (en vivo del nodo).',
          'doc.ep.networkHashrate': 'Hashrate historico de la red, agrupado por hora o dia en la ventana seleccionada.',
          'doc.ep.networkBlocktime': 'Varianza del tiempo entre bloques canonicos consecutivos (objetivo de 120s).',
          'doc.ep.networkMempool': 'Tamano del mempool (transacciones pendientes) en el tiempo, muestreado en cada poll del worker.',
          'doc.ep.networkEmission': 'Recompensa de bloque promedio en el tiempo — muestra la tail emission de Monero (~0,6 XMR por bloque).',
          'doc.ep.chainWindow': 'Ventana de bloques en bruto entre dos alturas (max 1000 bloques).',
          'doc.ep.chainForkWindow': 'Los ultimos N bloques con huerfanos y marcadores de fork, para el visualizador de cadena.',
          'doc.ep.reorgs': 'Lista de las reorganizaciones detectadas mas recientes.',
          'doc.ep.reorgsStats': 'Estadisticas de reorgs agregadas en ventanas de 24h, 7d y 30d.',
          'doc.ep.orphansRecent': 'Bloques huerfanos recientes con su bloque canonico competidor.',
          'doc.ep.poolsDistribution': 'Distribucion de bloques canonicos por pool de mineria en la ventana (medida de descentralizacion).',
          'doc.fundingTitle': 'Apoya el proyecto',
          'doc.fundingP1': 'monerometrics funciona sobre una infraestructura autofinanciada.',

          // Info tooltips (explicacion + limite)
          'info.mempool': 'Numero de transacciones no confirmadas en espera en el mempool del nodo. Refleja la demanda pendiente actual en la red. Limite: instantanea en vivo del nodo, no un promedio historico.',
          'info.blocktime': 'Tiempo transcurrido entre bloques canonicos consecutivos. Monero apunta a 120s; la varianza refleja las fluctuaciones del hashrate. Limite: medicion por bloque, solo ventanas cortas (hasta 30d).',
          'info.pools': 'Cuota de bloques canonicos minados por pool en la ventana, un indicador de descentralizacion. Limite: los pools se identifican mediante sus API publicas, por lo que la atribucion es fiable solo en ventanas recientes; los bloques no identificados (mineros solo, pools no rastreados) aparecen como unknown.',
          'info.nakamoto': 'Numero minimo de pools de mineria que juntas controlan mas del 50% de los bloques recientes (solo pools identificadas, excluyendo solo/unknown). Cuanto mas bajo, mas centralizado — una sola pool por encima del 50% es el riesgo del 51%.',
          'info.reorgs': 'Las reorganizaciones son eventos en los que la cadena reemplaza bloques aceptados recientemente por una rama competidora mas larga. Contadas en 24h, 7d y 30d. Limite: solo se registran las reorgs observadas desde que este nodo comenzo a indexar.',
          'info.orphans': 'Los bloques huerfanos son bloques validos reemplazados durante una reorganizacion y excluidos de la cadena canonica. Limite: muestra solo los huerfanos mas recientes, y depende de lo que este nodo observo.',
          'info.fork': 'Mapa visual de los ultimos bloques: la cadena canonica y las posibles ramas huerfanas, coloreadas por pool de mineria. Limite: muestra una ventana reciente de bloques, no todo el historial.',

          // Donation
          'donate.nav': 'Donar',
          'donate.title': 'Apoya monerometrics',
          'donate.body': 'monerometrics es de codigo abierto y autofinanciado, sin publicidad ni rastreo. Si te resulta util, una donacion en Monero ayuda a cubrir los costos de infraestructura y mantiene gratuitos el panel y la API publicos.',
          'donate.address': 'Direccion Monero',
          'donate.copy': 'Copiar direccion',
          'donate.copied': 'Copiado!',
          'donate.scan': 'Escanea para donar',

          // Language switcher
          'lang.label': 'Idioma',
        },
      },
    },
  })

export default i18n
