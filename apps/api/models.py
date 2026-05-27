"""
Schemas Pydantic v2 pour les responses API.
Alignes sur le schema Postgres reel.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Reponse /health."""
    status: str = "ok"
    db_connected: bool


class InfoResponse(BaseModel):
    """Reponse /info."""
    api_version: str = "0.1.0"
    network: str = "mainnet"
    latest_indexed_height: Optional[int] = None
    total_blocks_indexed: int = 0
    total_orphan_blocks: int = 0
    total_reorgs_detected: int = 0


class Block(BaseModel):
    """Bloc Monero indexe (schema reel)."""
    height: int
    hash: str
    prev_hash: str
    timestamp_unix: int
    timestamp_human: datetime
    difficulty: str  # numeric(40,0) -> str pour eviter overflow JSON
    tx_count: int
    size_bytes: int
    miner_pool: Optional[str] = None
    reward_xmr: Optional[str] = None  # numeric -> str
    is_canonical: bool = True


class ChainWindowResponse(BaseModel):
    """Reponse /chain/window."""
    from_height: int = Field(alias="from")
    to_height: int = Field(alias="to")
    count: int
    blocks: list[Block]

    model_config = {"populate_by_name": True}


class Reorg(BaseModel):
    """Reorg detectee (schema reel)."""
    id: int
    detected_at: datetime
    fork_point_height: int
    depth: int
    old_chain_tip_hash: str
    new_chain_tip_hash: str
    affected_tx_count: Optional[int] = None
    notes: Optional[str] = None


class ReorgsResponse(BaseModel):
    """Reponse /reorgs."""
    count: int
    reorgs: list[Reorg]


# === Endpoints analytiques ===

class ReorgStatsWindow(BaseModel):
    """Statistiques de reorgs sur une fenetre temporelle."""
    window: str  # "24h", "7d", "30d"
    count: int
    avg_depth: Optional[float] = None
    max_depth: Optional[int] = None
    total_affected_tx: int = 0


class ReorgStatsResponse(BaseModel):
    """Reponse /reorgs/stats : agregations sur 3 fenetres."""
    windows: list[ReorgStatsWindow]


class PoolShare(BaseModel):
    """Part de blocs minee par un pool sur la fenetre."""
    pool: str
    block_count: int
    percentage: float


class PoolDistributionResponse(BaseModel):
    """Reponse /pools/distribution : repartition pools."""
    window: str
    total_blocks: int
    distribution: list[PoolShare]


class OrphanBlock(BaseModel):
    """Bloc orphelin avec son canonical concurrent."""
    height: int
    orphan_hash: str
    canonical_hash: Optional[str] = None
    timestamp_human: datetime
    miner_pool: Optional[str] = None
    tx_count: int


class OrphansResponse(BaseModel):
    """Reponse /orphans/recent : derniers blocs orphelins."""
    count: int
    orphans: list[OrphanBlock]


# === Endpoints Network ===

class NetworkInfoResponse(BaseModel):
    """Reponse /network/info : etat actuel reseau Monero."""
    block_height: int
    block_hash: str
    target_height: int
    sync_pct: float
    synced: bool
    difficulty: str  # numeric -> str pour eviter overflow
    mempool_tx_count: int
    network_hashrate_h_s: Optional[int] = None  # H/s (Hashrate)
    last_block_age_seconds: Optional[int] = None


class HashratePoint(BaseModel):
    """Point de donnees hashrate sur un bucket temporel."""
    bucket: datetime
    hashrate_h_s: int  # Hashes per second


class HashrateResponse(BaseModel):
    """Reponse /network/hashrate."""
    window: str
    bucket_size: str
    points: list[HashratePoint]


class BlocktimePoint(BaseModel):
    """Point de donnees block time entre 2 blocs consecutifs."""
    height: int
    timestamp_unix: int
    delta_seconds: int  # Temps entre ce bloc et le precedent canonique


class BlocktimeResponse(BaseModel):
    """Reponse /network/blocktime."""
    window: str
    avg_delta: float
    median_delta: int
    points: list[BlocktimePoint]


# === Endpoint Fork Window (pour Cytoscape) ===

class ForkBlock(BaseModel):
    """Bloc dans la fenetre de fork visualizer."""
    height: int
    hash: str
    prev_hash: str
    is_canonical: bool
    miner_pool: Optional[str] = None
    timestamp_unix: int
    tx_count: int
    is_fork_point: bool = False  # True si ce bloc est un fork point


class ForkWindowResponse(BaseModel):
    """Reponse /chain/fork-window : derniers N blocs + flags fork."""
    tip_height: int
    blocks_count: int
    reorgs_count: int
    blocks: list[ForkBlock]
