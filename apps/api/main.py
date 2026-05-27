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
from models import (
    HealthResponse, InfoResponse, Block,
    ChainWindowResponse, Reorg, ReorgsResponse,
    ReorgStatsWindow, ReorgStatsResponse,
    PoolShare, PoolDistributionResponse,
    OrphanBlock, OrphansResponse,
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
    version="0.1.0",
    lifespan=lifespan,
)

# CORS pour le dashboard React (monerometrics.net)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://monerometrics.net", "https://www.monerometrics.net"],
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
    window: str = Query("24h", regex="^(24h|7d|30d)$"),
):
    """
    Repartition des blocs canoniques minees par pool sur la fenetre.
    Mesure la decentralisation du reseau (concentration de hashrate).
    """
    interval_map = {"24h": "24 hours", "7d": "7 days", "30d": "30 days"}
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
