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
