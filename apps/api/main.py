"""
API REST monerometrics : lecture seule sur Postgres.

Endpoints :
- GET /health   : liveness + check DB connection
- GET /info     : metadata global (latest height, total blocks, orphans, reorgs)
- GET /chain/window?from=X&to=Y : fenetre de blocs (max 1000)
- GET /reorgs?limit=100 : derniers reorgs detectes (max 1000)
"""
import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from db import init_pool, close_pool, get_pool, get_database_url
import httpx
import os
from models import (
    HealthResponse, InfoResponse, Block,
    ChainWindowResponse, Reorg, ReorgsResponse,
    ReorgStatsWindow, ReorgStatsResponse,
    PoolShare, PoolDistributionResponse,
    OrphanBlock, OrphansResponse,
    NetworkInfoResponse, HashratePoint, HashrateResponse,
    BlocktimePoint, BlocktimeResponse,
    ForkBlock, ForkWindowResponse,
)

# === Logging ===
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    stream=sys.stdout,
)
log = logging.getLogger("monerometrics-api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Init pool au demarrage, fermeture au shutdown."""
    database_url, source = get_database_url()
    log.info(f"Postgres credentials source: {source}")
    log.info("Initializing asyncpg connection pool...")
    await init_pool(database_url)
    log.info("Pool initialized. API ready.")
    yield
    log.info("Shutting down...")
    await close_pool()


app = FastAPI(
    title="monerometrics API",
    description="API publique lecture seule sur l'indexation Monero",
    version="0.3.1",
    lifespan=lifespan,
)

# CORS pour le dashboard React (monerometrics.net)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://monerometrics.net",
        "https://www.monerometrics.net",
        "http://localhost:5173",  # Vite dev server (build local)
        "http://localhost:4173",  # Vite preview (test build prod local)
    ],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health():
    """Liveness probe + verif connexion DB."""
    try:
        pool = get_pool()
        async with pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        return HealthResponse(status="ok", db_connected=True)
    except Exception as e:
        log.error(f"Health check failed: {e}")
        return HealthResponse(status="degraded", db_connected=False)


@app.get("/info", response_model=InfoResponse)
async def info():
    """Metadata global sur l'indexation."""
    pool = get_pool()
    async with pool.acquire() as conn:
        latest = await conn.fetchval(
            "SELECT MAX(height) FROM blocks WHERE is_canonical = true"
        )
        total_blocks = await conn.fetchval(
            "SELECT COUNT(*) FROM blocks WHERE is_canonical = true"
        )
        total_orphans = await conn.fetchval(
            "SELECT COUNT(*) FROM blocks WHERE is_canonical = false"
        )
        total_reorgs = await conn.fetchval(
            "SELECT COUNT(*) FROM reorgs_detected"
        )

    return InfoResponse(
        latest_indexed_height=latest,
        total_blocks_indexed=total_blocks or 0,
        total_orphan_blocks=total_orphans or 0,
        total_reorgs_detected=total_reorgs or 0,
    )


@app.get("/chain/window", response_model=ChainWindowResponse)
async def chain_window(
    from_height: int = Query(..., alias="from", ge=0),
    to_height: int = Query(..., alias="to", ge=0),
):
    """Fenetre de blocs entre from et to (inclus). Max 1000 blocs."""
    if to_height < from_height:
        raise HTTPException(400, "to must be >= from")
    if to_height - from_height > 1000:
        raise HTTPException(400, "max 1000 blocks per request")

    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT height, hash, prev_hash, timestamp_unix, timestamp_human,
                   difficulty::text AS difficulty, tx_count, size_bytes,
                   miner_pool, reward_xmr::text AS reward_xmr, is_canonical
            FROM blocks
            WHERE height BETWEEN $1 AND $2
            ORDER BY height
            """,
            from_height, to_height,
        )

    blocks = [Block(**dict(r)) for r in rows]
    return ChainWindowResponse(
        from_height=from_height,
        to_height=to_height,
        count=len(blocks),
        blocks=blocks,
    )


@app.get("/reorgs", response_model=ReorgsResponse)
async def reorgs(limit: int = Query(100, ge=1, le=1000)):
    """Derniers reorgs detectes (max 1000)."""
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, detected_at, fork_point_height, depth,
                   old_chain_tip_hash, new_chain_tip_hash,
                   affected_tx_count, notes
            FROM reorgs_detected
            ORDER BY detected_at DESC
            LIMIT $1
            """,
            limit,
        )

    reorgs_list = [Reorg(**dict(r)) for r in rows]
    return ReorgsResponse(count=len(reorgs_list), reorgs=reorgs_list)



@app.get("/reorgs/stats", response_model=ReorgStatsResponse)
async def reorgs_stats():
    """
    Statistiques de reorgs sur 3 fenetres temporelles (24h, 7d, 30d).
    Demontre l'evolution de la sante du reseau Monero.
    """
    pool = get_pool()
    windows_config = [
        ("24h", "24 hours"),
        ("7d", "7 days"),
        ("30d", "30 days"),
    ]
    windows = []

    async with pool.acquire() as conn:
        for label, interval in windows_config:
            row = await conn.fetchrow(
                f"""
                SELECT COUNT(*) AS count,
                       AVG(depth)::float AS avg_depth,
                       MAX(depth) AS max_depth,
                       COALESCE(SUM(affected_tx_count), 0) AS total_affected_tx
                FROM reorgs_detected
                WHERE detected_at >= NOW() - INTERVAL '{interval}'
                """
            )
            windows.append(ReorgStatsWindow(
                window=label,
                count=row["count"] or 0,
                avg_depth=row["avg_depth"],
                max_depth=row["max_depth"],
                total_affected_tx=row["total_affected_tx"] or 0,
            ))

    return ReorgStatsResponse(windows=windows)


@app.get("/pools/distribution", response_model=PoolDistributionResponse)
async def pools_distribution(
    window: str = Query("24h", regex="^(1h|6h|24h|48h|7d)$"),
):
    """
    Repartition des blocs canoniques minees par pool sur la fenetre.
    Mesure la decentralisation du reseau (concentration de hashrate).
    Fenetres limitees au recent : l'attribution pool est fiable seulement
    sur la profondeur exposee par les API des pools.
    """
    interval_map = {"1h": "1 hour", "6h": "6 hours", "24h": "24 hours", "48h": "48 hours", "7d": "7 days"}
    interval = interval_map[window]

    pool_obj = get_pool()
    async with pool_obj.acquire() as conn:
        rows = await conn.fetch(
            f"""
            SELECT COALESCE(miner_pool, 'unknown') AS pool,
                   COUNT(*) AS block_count
            FROM blocks
            WHERE is_canonical = true
              AND timestamp_human >= NOW() - INTERVAL '{interval}'
            GROUP BY miner_pool
            ORDER BY block_count DESC
            """
        )

    total = sum(r["block_count"] for r in rows)
    distribution = [
        PoolShare(
            pool=r["pool"],
            block_count=r["block_count"],
            percentage=round(r["block_count"] * 100.0 / total, 2) if total else 0.0,
        )
        for r in rows
    ]

    return PoolDistributionResponse(
        window=window,
        total_blocks=total,
        distribution=distribution,
    )


@app.get("/orphans/recent", response_model=OrphansResponse)
async def orphans_recent(limit: int = Query(50, ge=1, le=500)):
    """
    Derniers blocs orphelins detectes avec leur canonical concurrent.
    Visualise la chaine alternative que Monero a rejetee.
    """
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT o.height, o.hash AS orphan_hash, c.hash AS canonical_hash,
                   o.timestamp_human, o.miner_pool, o.tx_count
            FROM blocks o
            LEFT JOIN blocks c ON c.height = o.height AND c.is_canonical = true
            WHERE o.is_canonical = false
            ORDER BY o.height DESC
            LIMIT $1
            """,
            limit,
        )

    orphans = [OrphanBlock(**dict(r)) for r in rows]
    return OrphansResponse(count=len(orphans), orphans=orphans)



# === Helper RPC monerod ===

MONEROD_RPC_URL = os.getenv("MONEROD_RPC_URL", "http://monerod:18081")


async def monerod_rpc(method: str, params: dict = None):
    """Appel JSON-RPC vers monerod."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{MONEROD_RPC_URL}/json_rpc",
            json={"jsonrpc": "2.0", "id": "0", "method": method, "params": params or {}},
        )
        response.raise_for_status()
        result = response.json()
        if "error" in result:
            raise HTTPException(502, f"monerod RPC error: {result['error']}")
        return result.get("result", {})


async def monerod_get_info():
    """GET /get_info endpoint (pas JSON-RPC)."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(f"{MONEROD_RPC_URL}/get_info")
        response.raise_for_status()
        return response.json()


# === Endpoints Network ===

# === Helpers fenetres temporelles ===
# Mapping window -> (intervalle SQL, granularite date_trunc)
WINDOW_CONFIG = {
    "1h":  ("1 hour",    "minute"),
    "24h": ("24 hours",  "hour"),
    "7d":  ("7 days",    "hour"),
    "30d": ("30 days",   "day"),
    "90d": ("90 days",   "day"),
    "1y":  ("365 days",  "week"),
    "5y":  ("1825 days", "month"),
}
WINDOW_REGEX = "^(1h|24h|7d|30d|90d|1y|5y)$"


# Cache memoire pour /network/info (TTL 30s)
_network_info_cache = {"data": None, "timestamp": 0}


@app.get("/network/info", response_model=NetworkInfoResponse)
async def network_info():
    """
    Etat actuel du reseau Monero : sync state, mempool, hashrate.
    Combine RPC monerod direct + DB indexee.
    Cache 30s pour resister aux pics de charge monerod (sync intensive).
    """
    import time
    now = time.time()

    # Si cache valide (<30s) et monerod en train de sync, on sert le cache
    if _network_info_cache["data"] and (now - _network_info_cache["timestamp"]) < 30:
        return _network_info_cache["data"]

    try:
        info = await monerod_get_info()
    except Exception as e:
        log.warning(f"monerod /get_info failed: {e}, returning cached if any")
        # En cas d'echec : si on a un cache (meme expire), on le retourne
        if _network_info_cache["data"]:
            return _network_info_cache["data"]
        raise HTTPException(503, "monerod unreachable")

    # Mempool count : tx_pool_size depuis get_info (RPC get_transaction_pool_stats indispo sur ce noeud)
    mempool_count = int(info.get("tx_pool_size", 0) or 0)

    # Calcul hashrate : difficulty / target_block_time (120s pour Monero)
    difficulty = int(info.get("difficulty", 0))
    hashrate = difficulty // 120 if difficulty else None

    height = info.get("height", 0)
    target = info.get("target_height", 0) or height
    sync_pct = (height / target * 100) if target else 0.0

    # Age du dernier bloc
    pool_obj = get_pool()
    last_block_age = None
    async with pool_obj.acquire() as conn:
        ts = await conn.fetchval(
            "SELECT timestamp_unix FROM blocks WHERE is_canonical = true ORDER BY height DESC LIMIT 1"
        )
        if ts:
            import time
            last_block_age = int(time.time()) - ts

    response = NetworkInfoResponse(
        block_height=height,
        block_hash=info.get("top_block_hash", ""),
        target_height=target,
        sync_pct=round(sync_pct, 2),
        synced=info.get("synchronized", False),
        difficulty=str(difficulty),
        mempool_tx_count=mempool_count,
        network_hashrate_h_s=hashrate,
        last_block_age_seconds=last_block_age,
    )
    _network_info_cache["data"] = response
    _network_info_cache["timestamp"] = now
    return response


@app.get("/network/hashrate", response_model=HashrateResponse)
async def network_hashrate(
    window: str = Query("30d", regex=WINDOW_REGEX),
):
    """
    Hashrate historique calcule depuis (difficulty / 120s).
    Bucketise selon la fenetre (minute -> mois).
    """
    interval, grain = WINDOW_CONFIG[window]
    bucket_size = f"1 {grain}"

    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"""
            SELECT date_trunc('{grain}', timestamp_human) AS bucket,
                   (AVG(difficulty) / 120)::bigint AS hashrate_h_s
            FROM blocks
            WHERE is_canonical = true
              AND timestamp_unix > 0
              AND timestamp_human >= NOW() - INTERVAL '{interval}'
            GROUP BY bucket
            ORDER BY bucket
            """
        )

    points = [HashratePoint(bucket=r["bucket"], hashrate_h_s=r["hashrate_h_s"] or 0) for r in rows]
    return HashrateResponse(window=window, bucket_size=bucket_size, points=points)


@app.get("/network/blocktime", response_model=BlocktimeResponse)
async def network_blocktime(
    window: str = Query("24h", regex=WINDOW_REGEX),
):
    """
    Variance temps entre blocs canoniques consecutifs.
    Statistique : Monero cible 120s, mais varie selon hashrate.
    """
    interval, _grain = WINDOW_CONFIG[window]

    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"""
            WITH ordered AS (
                SELECT height, timestamp_unix,
                       LAG(timestamp_unix) OVER (ORDER BY height) AS prev_ts
                FROM blocks
                WHERE is_canonical = true
                  AND timestamp_human >= NOW() - INTERVAL '{interval}'
            )
            SELECT height, timestamp_unix, (timestamp_unix - prev_ts) AS delta_seconds
            FROM ordered
            WHERE prev_ts IS NOT NULL
              AND (timestamp_unix - prev_ts) BETWEEN 0 AND 3600
            ORDER BY height
            """
        )

    points = [BlocktimePoint(**dict(r)) for r in rows]
    if points:
        deltas = sorted(p.delta_seconds for p in points)
        avg = sum(deltas) / len(deltas)
        median = deltas[len(deltas) // 2]
    else:
        avg = 0.0
        median = 0

    return BlocktimeResponse(
        window=window,
        avg_delta=round(avg, 2),
        median_delta=median,
        points=points,
    )


# === Endpoint Fork Window (pour Cytoscape) ===

@app.get("/chain/fork-window", response_model=ForkWindowResponse)
async def chain_fork_window(limit: int = Query(80, ge=10, le=500)):
    """
    Derniers N blocs (canoniques + orphans) avec flags fork point.
    Source de donnees pour le Cytoscape Chain Fork Visualizer.
    """
    pool = get_pool()
    async with pool.acquire() as conn:
        # Tip canonical
        tip = await conn.fetchval(
            "SELECT MAX(height) FROM blocks WHERE is_canonical = true"
        )
        if not tip:
            return ForkWindowResponse(tip_height=0, blocks_count=0, reorgs_count=0, blocks=[])

        # Fork points (heights ou reorg detecte)
        fork_heights = set()
        reorg_rows = await conn.fetch(
            """
            SELECT fork_point_height FROM reorgs_detected
            WHERE fork_point_height >= $1
            """,
            tip - limit,
        )
        fork_heights = {r["fork_point_height"] for r in reorg_rows}

        # Tous les blocs (canonical + orphan) dans la fenetre
        rows = await conn.fetch(
            """
            SELECT height, hash, prev_hash, is_canonical,
                   miner_pool, timestamp_unix, tx_count
            FROM blocks
            WHERE height BETWEEN $1 AND $2
            ORDER BY height DESC, is_canonical DESC
            """,
            tip - limit, tip,
        )

    blocks = []
    for r in rows:
        d = dict(r)
        d["is_fork_point"] = d["height"] in fork_heights
        blocks.append(ForkBlock(**d))

    return ForkWindowResponse(
        tip_height=tip,
        blocks_count=len(blocks),
        reorgs_count=len(fork_heights),
        blocks=blocks,
    )
