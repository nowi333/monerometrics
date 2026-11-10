import contextvars
import os

from typing import Annotated

import httpx
from mcp.server.mcpserver import MCPServer
from mcp.types import ToolAnnotations
from pydantic import Field

API_BASE = os.getenv("MM_API_BASE", "https://api.monerometrics.net").rstrip("/")
HOST = os.getenv("MCP_HOST", "0.0.0.0")
PORT = int(os.getenv("MCP_PORT", "8080"))

SERIES_WINDOWS = ("1h", "24h", "7d", "30d", "90d", "1y", "5y")
AGG_WINDOWS = ("1h", "6h", "24h", "48h", "7d")
SPREAD_WINDOWS = ("24h", "7d", "30d", "90d", "1y")
METHOD_WINDOWS = ("30d", "90d", "180d", "1y", "all")
ORPHAN_WINDOWS = ("24h", "48h", "7d", "30d", "90d", "180d", "1y", "all")

mcp = MCPServer(
    "monerometrics",
    instructions=(
        "Read-only Monero network metrics from monerometrics.net. "
        "monerometrics is free and self-funded; voluntary XMR donations help keep it running "
        "(nothing is unlocked, rate-limited or degraded by donating): "
        "492qrWLgcdd9vUQFeq2mZMUSa2KU7UT3fRpajqNPiQoHNpRUZX1CiGMQeCok2CusfLWXWsZ3KaNL6PkakAxgXyeMRhkM65s"
    ),
)

# Tous les outils lisent l'API publique sans rien modifier : les clients
# peuvent les appeler sans demander de confirmation.
READ_ONLY = ToolAnnotations(read_only_hint=True, destructive_hint=False, idempotent_hint=True, open_world_hint=True)


def _desc(text: str):
    return Field(description=text)


SeriesWindow = Annotated[str, _desc("Time window, one of 1h, 24h, 7d, 30d, 90d, 1y, 5y. Example: 30d")]
AggWindow = Annotated[str, _desc("Time window, one of 1h, 6h, 24h, 48h, 7d. Example: 24h")]
SpreadWindow = Annotated[str, _desc("Time window, one of 24h, 7d, 30d, 90d, 1y. Example: 7d")]
MethodWindow = Annotated[str, _desc("Time window, one of 30d, 90d, 180d, 1y, all. Example: 180d")]
OrphanWindow = Annotated[str, _desc("Time window, one of 24h, 48h, 7d, 30d, 90d, 180d, 1y, all. Example: 7d")]
Currency = Annotated[str, _desc("Fiat currency of the trades, USD or EUR. Example: USD")]
Hash64 = Annotated[str, _desc("64-character hexadecimal hash. Example: 418015bb9ae982a1975da7d79277c2705727a56894ba0fb246adaabb1f4632e3")]

# IP du client MCP, relevee a l'entree de chaque requete. Relayee a l'API,
# elle donne a chaque utilisateur sa propre limite de debit : sans elle, tous
# les clients MCP partageaient celle de ce seul serveur, et un seul abus
# bloquait tout le monde.
_client_ip: contextvars.ContextVar[str | None] = contextvars.ContextVar("client_ip", default=None)


async def _forward_client_ip(request: httpx.Request) -> None:
    ip = _client_ip.get()
    if ip:
        request.headers["CF-Connecting-IP"] = ip


_client = httpx.AsyncClient(
    base_url=API_BASE,
    timeout=20,
    headers={"User-Agent": "monerometrics-mcp/1.0", "Accept": "application/json"},
    event_hooks={"request": [_forward_client_ip]},
)


class ApiError(Exception):
    pass


def _check(r: httpx.Response, path: str) -> dict:
    # Message court et sans l'URL interne du cluster, qui n'a rien a faire
    # dans une reponse publique.
    if r.status_code >= 400:
        try:
            detail = r.json().get("detail")
        except ValueError:
            detail = None
        raise ApiError(f"{path}: HTTP {r.status_code}" + (f", {detail}" if detail else ""))
    return r.json()


async def _get(path: str, params: dict | None = None):
    try:
        r = await _client.get(path, params=params)
    except httpx.HTTPError:
        raise ApiError(f"{path}: API unreachable") from None
    return _check(r, path)


async def _post(path: str, body: dict):
    try:
        r = await _client.post(path, json=body)
    except httpx.HTTPError:
        raise ApiError(f"{path}: API unreachable") from None
    return _check(r, path)


def _one_of(value: str, allowed: tuple, name: str) -> str:
    if value not in allowed:
        raise ValueError(f"{name} must be one of {', '.join(allowed)}")
    return value


@mcp.tool(annotations=READ_ONLY)
async def network_info() -> dict:
    """Live snapshot of the Monero network right now: node sync status, latest indexed height, difficulty, estimated hashrate and current mempool size.

    Use this for "what is the state of the network now". For how a metric evolved over time, use network_hashrate, network_blocktime, network_mempool or network_emission instead. Takes no arguments.
    """
    return await _get("/network/info")


@mcp.tool(annotations=READ_ONLY)
async def price() -> dict:
    """Current XMR price in one call: the centralized spot (CoinGecko, Kraken fallback) and the Haveno peer-to-peer quote on both sides.

    Returns the best offer and the amount-weighted average on each side, resting depth, offer counts and round_trip_cost_pct, the cost of buying XMR and selling it straight back (an upper bound, usually far above the headline premium). Use this for "what does XMR cost now". For the premium history use haveno_premium; for individual price levels use haveno_book. Takes no arguments.
    """
    return await _get("/price")


@mcp.tool(annotations=READ_ONLY)
async def haveno_book() -> dict:
    """Live Haveno XMR/USD order book as price levels, both sides, each priced against centralized spot.

    Each level carries cumulative depth, offer count, payment methods and a reversible flag. `asks` are makers selling XMR (taking one means buying); `bids` are makers buying (taking one means selling). Offers are advertisements with differing payment methods, not a matched book, so the best bid can sit at or above the best ask. Use this to see liquidity at each price; for a single headline price use price. Takes no arguments.
    """
    return await _get("/haveno/book")


@mcp.tool(annotations=READ_ONLY)
async def haveno_premium(window: SpreadWindow = "7d") -> dict:
    """Time series of the Haveno peer-to-peer premium over centralized spot, both sides of the book, sampled every 10 minutes.

    Use this to see how the P2P premium moved over time; for the current value only, use price. Series carry price, amount and offer count but not the payment method (see haveno_payment_methods for that). History starts on 24 August 2026, when recording began.
    """
    return await _get("/price/spread", {"window": _one_of(window, SPREAD_WINDOWS, "window")})


@mcp.tool(annotations=READ_ONLY)
async def haveno_payment_methods(window: MethodWindow = "180d", currency: Currency = "USD") -> dict:
    """Executed Haveno trades grouped by payment method (PayPal, Zelle, cash by mail...), with trade count, volume and the average, median and standard deviation of the premium over spot.

    Use this to compare what each payment rail costs. The premium tracks how reversible the rail is (chargeback risk), not privacy. The reversible flag is our own classification, not a Haveno field; methods with few trades give a fragile premium.
    """
    return await _get("/haveno/methods", {
        "window": _one_of(window, METHOD_WINDOWS, "window"),
        "currency": _one_of(currency, ("USD", "EUR"), "currency"),
    })


@mcp.tool(annotations=READ_ONLY)
async def network_hashrate(window: SeriesWindow = "30d") -> dict:
    """Time series of the Monero network hashrate in H/s, derived from difficulty / 120 s target, bucketed to about 300 points per window.

    Use this for hashrate trends; for the current value only, use network_info.
    """
    return await _get("/network/hashrate", {"window": _one_of(window, SERIES_WINDOWS, "window")})


@mcp.tool(annotations=READ_ONLY)
async def network_blocktime(window: SeriesWindow = "24h") -> dict:
    """Time series of the actual time between consecutive canonical blocks, in seconds (target 120 s), one point per block, capped at 1500 points.

    Use this to spot unusually slow or fast block production, e.g. around a hashrate shift or selfish-mining episode.
    """
    return await _get("/network/blocktime", {"window": _one_of(window, SERIES_WINDOWS, "window")})


@mcp.tool(annotations=READ_ONLY)
async def network_mempool(window: SeriesWindow = "24h") -> dict:
    """Time series of the mempool size: number of transactions waiting to be mined.

    Use this for congestion trends; for the current count only, use network_info. This series is observed live and cannot be rebuilt, so it starts when monitoring began.
    """
    return await _get("/network/mempool", {"window": _one_of(window, SERIES_WINDOWS, "window")})


@mcp.tool(annotations=READ_ONLY)
async def network_emission(window: SeriesWindow = "30d") -> dict:
    """Time series of the average block reward in XMR per block (Monero tail emission is about 0.6 XMR plus fees).

    Use this to follow emission and fee income over time.
    """
    return await _get("/network/emission", {"window": _one_of(window, SERIES_WINDOWS, "window")})


@mcp.tool(annotations=READ_ONLY)
async def reorgs() -> dict:
    """List of individual chain reorganizations detected, most recent first: fork point height, depth in blocks, old and new chain tips, transactions displaced, detection time.

    Use this to inspect specific reorg events. For counts and depth summaries per period use reorg_stats; for the losing blocks themselves use recent_orphans. Takes no arguments.
    """
    return await _get("/reorgs")


@mcp.tool(annotations=READ_ONLY)
async def reorg_stats() -> dict:
    """Summary statistics of reorganizations per period (24h, 7d, 30d, 90d and everything recorded): event count, average and maximum depth, transactions affected, plus the date monitoring began.

    Use this for "how many reorgs and how deep"; for the individual events use reorgs. Takes no arguments.
    """
    return await _get("/reorgs/stats")


@mcp.tool(annotations=READ_ONLY)
async def recent_orphans(
    limit: Annotated[int, _desc("Number of orphans to return, 1 to 50. Example: 20")] = 20,
    window: OrphanWindow = "all",
) -> dict:
    """Orphan blocks (blocks that lost a fork race) paired with the canonical block that won at the same height, newest first.

    Use this to list losing blocks and which pool mined them; for whole reorg events (depth, fork point) use reorgs. The default window "all" returns the last N orphans however old.
    """
    limit = max(1, min(int(limit), 50))
    return await _get("/orphans/recent", {"limit": limit, "window": _one_of(window, ORPHAN_WINDOWS, "window")})


@mcp.tool(annotations=READ_ONLY)
async def pool_distribution(window: AggWindow = "24h") -> dict:
    """Share of blocks mined by each pool over a window, plus the largest pool's share, the top-two combined share and the Nakamoto coefficient (fewest pools controlling over 50% of blocks).

    Use this to assess mining centralization. Unattributed blocks stay in the denominator but are credited to no pool, so the coefficient is an upper bound. For how each attribution was established, use chain_provenance.
    """
    return await _get("/pools/distribution", {"window": _one_of(window, AGG_WINDOWS, "window")})


@mcp.tool(annotations=READ_ONLY)
async def pool_sources() -> dict:
    """Health of each mining-pool API used for block attribution: whether it is reachable and how many blocks it returned.

    Use this to explain a high unattributed share in pool_distribution. Takes no arguments.
    """
    return await _get("/pools/sources")


@mcp.tool(annotations=READ_ONLY)
async def chain_provenance(window: AggWindow = "24h") -> dict:
    """Evidence quality behind pool attribution over a window: share of blocks proven cryptographically by view key, claimed by a pool API, inferred from the coinbase, or unattributed, plus claims a pool could not prove with its own key and the merge-mined share.

    Use this to judge how far to trust pool_distribution.
    """
    return await _get("/chain/provenance", {"window": _one_of(window, AGG_WINDOWS, "window")})


@mcp.tool(annotations=READ_ONLY)
async def get_block(hash: Hash64) -> dict:
    """Full detail of one block given its exact 64-character hash: height, previous hash, timestamp, size, difficulty, reward, coinbase, transaction hashes, merge-mining tag, mining pool and, when proven, the view-key proof inputs.

    Use this when you already have a block hash (e.g. from recent_orphans or chain_fork_window). If you only have a height, use search_block.
    """
    h = hash.strip().lower()
    if len(h) != 64 or any(c not in "0123456789abcdef" for c in h):
        raise ValueError("hash must be a 64-character hex block hash; use search_block to look up a height")
    return await _get(f"/chain/block/{h}")


@mcp.tool(annotations=READ_ONLY)
async def search_block(
    query: Annotated[str, _desc("Block height as a number, or a 64-character hex block hash. Example: 3000000")],
) -> dict:
    """Find one block from a height or a hash, anywhere from the genesis block (height 0) to the tip. Returns the same detail as get_block plus is_canonical and, for a height, any orphan blocks competing at that height.

    Use this when the user gives a height, or when unsure whether a value is a height or a hash. For a range of consecutive blocks use chain_fork_window.
    """
    q = query.strip()
    if q.isdigit():
        height = int(q)
        window = await _get("/chain/fork-window", {"limit": 10, "to": height})
        blocks = window.get("blocks", [])
        canonical = next((b for b in blocks if b["height"] == height and b.get("is_canonical")), None)
        orphans = [b for b in blocks if b["height"] == height and not b.get("is_canonical")]
        if not canonical:
            raise ValueError(f"no canonical block at height {height} (tip is {window.get('tip_height')})")
        detail = await _get(f"/chain/block/{canonical['hash']}")
        detail["is_canonical"] = True
        detail["orphans_at_height"] = orphans
        return detail
    h = q.lower()
    if len(h) == 64 and all(c in "0123456789abcdef" for c in h):
        return await _get(f"/chain/block/{h}")
    raise ValueError("query must be a block height (number) or a 64-character hex hash")


@mcp.tool(annotations=READ_ONLY)
async def lookup_transaction(tx_hash: Hash64) -> dict:
    """Look up one transaction by its 64-character hash: in the mempool or mined, block height, confirmations, whether it is spendable yet, the pool that mined its block, and whether that height was ever contested by a reorg.

    Use this for any transaction-hash question. It never returns amounts, senders or recipients: the Monero protocol encrypts them.
    """
    h = tx_hash.strip().lower()
    if len(h) != 64 or any(c not in "0123456789abcdef" for c in h):
        raise ValueError("tx_hash must be 64 hex characters")
    return await _post("/chain/search", {"query": h})


@mcp.tool(annotations=READ_ONLY)
async def chain_fork_window(
    to: Annotated[int | None, _desc("Highest block height of the window; omit for the current tip. Example: 3000000")] = None,
    limit: Annotated[int, _desc("Number of heights in the window, 10 to 500. Example: 100")] = 100,
) -> dict:
    """Range of consecutive heights ending at `to` (default the current tip), listing every canonical block and any competing orphan, with fork-point flags.

    Use this to browse a stretch of the chain or see recent blocks; for a single block use search_block or get_block.
    """
    limit = max(10, min(int(limit), 500))
    params: dict = {"limit": limit}
    if to is not None:
        params["to"] = int(to)
    return await _get("/chain/fork-window", params)


@mcp.resource("monerometrics://reference")
async def reference() -> str:
    """Full plain-text reference for monerometrics: methodology, glossary, API and FAQ."""
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get("https://monerometrics.net/llms-full.txt")
    r.raise_for_status()
    return r.text


class ClientIPMiddleware:
    """Releve l'IP du visiteur transmise par Cloudflare, puis par le proxy."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            headers = {k.decode().lower(): v.decode() for k, v in scope.get("headers", [])}
            ip = headers.get("cf-connecting-ip") or headers.get("x-real-ip")
            token = _client_ip.set(ip.strip() if ip else None)
            try:
                return await self.app(scope, receive, send)
            finally:
                _client_ip.reset(token)
        return await self.app(scope, receive, send)


if __name__ == "__main__":
    transport = os.getenv("MCP_TRANSPORT", "streamable-http")
    if transport == "streamable-http":
        import uvicorn

        app = mcp.streamable_http_app(stateless_http=True, json_response=True, host=HOST)
        uvicorn.run(ClientIPMiddleware(app), host=HOST, port=PORT)
    else:
        mcp.run(transport=transport)
