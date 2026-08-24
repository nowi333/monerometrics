from datetime import datetime
from typing import List, Optional
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
    pool_source: Optional[str] = None
    merge_mining: Optional[int] = None
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
    pool_source: Optional[str] = None
    merge_mining: Optional[int] = None
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
    pool_source: Optional[str] = None
    merge_mining: Optional[int] = None
    timestamp_unix: int
    tx_count: int
    is_fork_point: bool = False

class ForkWindowResponse(BaseModel):
    tip_height: int
    blocks_count: int
    reorgs_count: int
    blocks: list[ForkBlock]


class MergeMinedChain(BaseModel):
    """An auxiliary chain merge-mined into this Monero block."""
    name: Optional[str] = None
    height: Optional[int] = None
    id: Optional[str] = None


class BlockDetailResponse(BaseModel):
    """Full on-chain detail for one block, read live from the node."""
    height: int
    hash: str
    prev_hash: Optional[str] = None
    timestamp_unix: Optional[int] = None
    difficulty: Optional[str] = None
    reward_xmr: Optional[str] = None
    size_bytes: Optional[int] = None
    weight: Optional[int] = None
    long_term_weight: Optional[int] = None
    coinbase_hash: Optional[str] = None
    coinbase_outputs: Optional[int] = None
    tx_count: int = 0
    tx_hashes: list[str] = []
    merge_mining: list[MergeMinedChain] = []
    miner_pool: Optional[str] = None
    pool_source: Optional[str] = None
    proof_address: Optional[str] = None
    proof_viewkey: Optional[str] = None


class ProvenanceBucket(BaseModel):
    """How many blocks were attributed by a given method."""
    source: str
    block_count: int
    percentage: float


class ProvenanceResponse(BaseModel):
    """Evidence quality of our own attribution over a window."""
    window: str
    total_blocks: int
    attributed: int
    proven: int
    proven_share: float
    unproven_claims: int
    merge_mined: int
    merge_mined_share: float
    breakdown: list[ProvenanceBucket]


class PriceResponse(BaseModel):
    """XMR/USD from a centralised reference and from Haveno (RetoSwap).

    The official price is the spot rate exchanges quote; the Haveno street price
    is what XMR actually trades at peer-to-peer, usually at a premium.
    """
    official_usd: Optional[float] = None
    official_change_24h: Optional[float] = None
    official_source: Optional[str] = None
    haveno_usd: Optional[float] = None
    haveno_bid: Optional[float] = None
    haveno_ask: Optional[float] = None
    premium_pct: Optional[float] = None
    ask_premium_pct: Optional[float] = None
    haveno_ask_avg: Optional[float] = None
    ask_avg_premium_pct: Optional[float] = None
    haveno_ask_amount: Optional[float] = None
    haveno_ask_offers: Optional[int] = None
    premium_note: Optional[str] = None


class SpreadPoint(BaseModel):
    timestamp_unix: int
    official_usd: Optional[float] = None
    haveno_bid: Optional[float] = None
    haveno_ask: Optional[float] = None
    haveno_ask_avg: Optional[float] = None
    ask_premium_pct: Optional[float] = None
    ask_avg_premium_pct: Optional[float] = None
    ask_amount: Optional[float] = None
    ask_offers: Optional[int] = None


class SpreadResponse(BaseModel):
    """Haveno peer-to-peer quotes against the centralised spot reference.

    ask_premium_pct is what it actually costs to buy without KYC right now:
    the lowest Haveno ask over the centralised spot. The last traded price is
    reported too, but it is a past fill in a thin book and is not a live level.
    """
    window: str
    points: List[SpreadPoint] = []
    current_ask_premium_pct: Optional[float] = None
    current_ask_avg_premium_pct: Optional[float] = None
    avg_ask_premium_pct: Optional[float] = None
    haveno_vol_24h: Optional[float] = None
    current_ask_amount: Optional[float] = None
    current_ask_offers: Optional[int] = None
    samples: int = 0

class ExternalUsageResponse(BaseModel):
    """Count of external API requests (excluding the dashboard and the MCP server)."""
    external_requests: int


class HavenoMethod(BaseModel):
    payment_method: str
    trades: int
    volume_xmr: Optional[float] = None
    avg_premium_pct: Optional[float] = None
    median_premium_pct: Optional[float] = None
    stddev_premium_pct: Optional[float] = None
    reversible: Optional[bool] = None


class HavenoMethodsResponse(BaseModel):
    """Executed Haveno trades grouped by payment method, priced against centralized spot.

    The premium is each trade's price over the centralized daily close for that day.
    `reversible` flags payment rails that allow the buyer to claw funds back after
    release; it is our own classification, not a Haveno field.
    """
    window: str
    currency: str
    methods: List[HavenoMethod] = []
    trades_total: int = 0
    spot_source: Optional[str] = None


class HavenoLiquidityPoint(BaseModel):
    timestamp_unix: int
    max_liquidity: Optional[float] = None
    max_offers: Optional[int] = None


class HavenoLiquidityResponse(BaseModel):
    window: str
    currency: str
    points: List[HavenoLiquidityPoint] = []
    current_liquidity: Optional[float] = None
    current_offers: Optional[int] = None
    samples: int = 0


class HavenoTrade(BaseModel):
    timestamp_unix: int
    price: float
    payment_method: Optional[str] = None
    base_vol: Optional[float] = None
    premium_pct: Optional[float] = None


class HavenoTradesResponse(BaseModel):
    currency: str
    count: int = 0
    trades: List[HavenoTrade] = []
