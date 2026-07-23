from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class HealthResponse(BaseModel):
    status: str = 'ok'
    db_connected: bool

class InfoResponse(BaseModel):
    api_version: str = '0.1.0'
    network: str = 'mainnet'
    latest_indexed_height: Optional[int] = None
    total_blocks_indexed: int = 0
    total_orphan_blocks: int = 0
    total_reorgs_detected: int = 0

class Block(BaseModel):
    height: int
    hash: str
    prev_hash: str
    timestamp_unix: int
    timestamp_human: datetime
    difficulty: str
    tx_count: int
    size_bytes: int
    miner_pool: Optional[str] = None
    reward_xmr: Optional[str] = None
    is_canonical: bool = True

class ChainWindowResponse(BaseModel):
    from_height: int = Field(alias='from')
    to_height: int = Field(alias='to')
    count: int
    blocks: list[Block]
    model_config = {'populate_by_name': True}

class Reorg(BaseModel):
    id: int
    detected_at: datetime
    fork_point_height: int
    depth: int
    old_chain_tip_hash: str
    new_chain_tip_hash: str
    affected_tx_count: Optional[int] = None
    notes: Optional[str] = None

class ReorgsResponse(BaseModel):
    count: int
    reorgs: list[Reorg]

class ReorgStatsWindow(BaseModel):
    window: str
    count: int
    avg_depth: Optional[float] = None
    max_depth: Optional[int] = None
    total_affected_tx: int = 0

class ReorgStatsResponse(BaseModel):
    windows: list[ReorgStatsWindow]

class PoolShare(BaseModel):
    pool: str
    block_count: int
    percentage: float

class PoolDistributionResponse(BaseModel):
    window: str
    total_blocks: int
    top_pool: Optional[str] = None
    top_pool_share: float = 0.0
    nakamoto_coefficient: int = 0
    distribution: list[PoolShare]

class PoolSource(BaseModel):
    pool: str
    url: str
    ok: bool
    blocks: int
    checked_at: Optional[str] = None

class PoolSourcesResponse(BaseModel):
    sources: list[PoolSource]

class MempoolPoint(BaseModel):
    bucket: datetime
    tx_count: int

class MempoolResponse(BaseModel):
    window: str
    bucket_size: str
    current: int
    points: list[MempoolPoint]

class EmissionPoint(BaseModel):
    bucket: datetime
    avg_reward_xmr: str
    blocks: int

class EmissionResponse(BaseModel):
    window: str
    bucket_size: str
    points: list[EmissionPoint]

class OrphanBlock(BaseModel):
    height: int
    orphan_hash: str
    canonical_hash: Optional[str] = None
    timestamp_human: datetime
    miner_pool: Optional[str] = None
    tx_count: int

class OrphansResponse(BaseModel):
    count: int
    orphans: list[OrphanBlock]

class NetworkInfoResponse(BaseModel):
    block_height: int
    block_hash: str
    target_height: int
    sync_pct: float
    synced: bool
    difficulty: str
    mempool_tx_count: int
    network_hashrate_h_s: Optional[int] = None
    last_block_age_seconds: Optional[int] = None

class HashratePoint(BaseModel):
    bucket: datetime
    hashrate_h_s: int

class HashrateResponse(BaseModel):
    window: str
    bucket_size: str
    points: list[HashratePoint]

class BlocktimePoint(BaseModel):
    height: int
    timestamp_unix: int
    delta_seconds: int

class BlocktimeResponse(BaseModel):
    window: str
    avg_delta: float
    median_delta: int
    points: list[BlocktimePoint]

class ForkBlock(BaseModel):
    height: int
    hash: str
    prev_hash: str
    is_canonical: bool
    miner_pool: Optional[str] = None
    timestamp_unix: int
    tx_count: int
    is_fork_point: bool = False

class ForkWindowResponse(BaseModel):
    tip_height: int
    blocks_count: int
    reorgs_count: int
    blocks: list[ForkBlock]
