import os
import httpx
from mcp.server.fastmcp import FastMCP

API_BASE = os.getenv("MM_API_BASE", "https://api.monerometrics.net").rstrip("/")
HOST = os.getenv("MCP_HOST", "0.0.0.0")
PORT = int(os.getenv("MCP_PORT", "8080"))

SERIES_WINDOWS = ("1h", "24h", "7d", "30d", "90d", "1y", "5y")
AGG_WINDOWS = ("1h", "6h", "24h", "48h", "7d")

mcp = FastMCP("monerometrics", host=HOST, port=PORT, stateless_http=True, json_response=True)

_client = httpx.AsyncClient(
    base_url=API_BASE,
    timeout=20,
    headers={"User-Agent": "monerometrics-mcp/1.0", "Accept": "application/json"},
)


async def _get(path: str, params: dict | None = None):
    r = await _client.get(path, params=params)
    r.raise_for_status()
    return r.json()


def _one_of(value: str, allowed: tuple, name: str) -> str:
    if value not in allowed:
        raise ValueError(f"{name} must be one of {', '.join(allowed)}")
    return value


@mcp.tool()
async def network_info() -> dict:
    """Current Monero network state: latest indexed height, difficulty, network hashrate and mempool size."""
    return await _get("/network/info")


@mcp.tool()
async def price() -> dict:
    """Current Monero (XMR) price: official spot price plus a Haveno decentralized-exchange reference."""
    return await _get("/price")


@mcp.tool()
async def network_hashrate(window: str = "30d") -> dict:
    """Network hashrate time series. window in 1h,24h,7d,30d,90d,1y,5y."""
    return await _get("/network/hashrate", {"window": _one_of(window, SERIES_WINDOWS, "window")})


@mcp.tool()
async def network_blocktime(window: str = "24h") -> dict:
    """Block-time variance time series (seconds between blocks). window in 1h,24h,7d,30d,90d,1y,5y."""
    return await _get("/network/blocktime", {"window": _one_of(window, SERIES_WINDOWS, "window")})


@mcp.tool()
async def network_mempool(window: str = "24h") -> dict:
    """Mempool size time series (number of pending transactions). window in 1h,24h,7d,30d,90d,1y,5y."""
    return await _get("/network/mempool", {"window": _one_of(window, SERIES_WINDOWS, "window")})


@mcp.tool()
async def network_emission(window: str = "30d") -> dict:
    """Block reward / emission time series (XMR per block). window in 1h,24h,7d,30d,90d,1y,5y."""
    return await _get("/network/emission", {"window": _one_of(window, SERIES_WINDOWS, "window")})


@mcp.tool()
async def reorgs() -> dict:
    """Detected Monero chain reorganizations, most recent first, with fork point, depth and affected transactions."""
    return await _get("/reorgs")


@mcp.tool()
async def reorg_stats() -> dict:
    """Aggregate reorg statistics over windows: counts, average and maximum depth, affected transactions."""
    return await _get("/reorgs/stats")


@mcp.tool()
async def recent_orphans(limit: int = 20) -> dict:
    """Recent orphan blocks with their canonical counterpart at the same height. limit 1..50."""
    limit = max(1, min(int(limit), 50))
    return await _get("/orphans/recent", {"limit": limit})


@mcp.tool()
async def pool_distribution(window: str = "24h") -> dict:
    """Mining-pool distribution over a window: block share per pool, largest-pool share and the Nakamoto coefficient (minimum pools controlling >50% of blocks). window in 1h,6h,24h,48h,7d."""
    return await _get("/pools/distribution", {"window": _one_of(window, AGG_WINDOWS, "window")})


@mcp.tool()
async def pool_sources() -> dict:
    """Reachability status of each mining-pool API used for block attribution."""
    return await _get("/pools/sources")


@mcp.tool()
async def chain_provenance(window: str = "24h") -> dict:
    """How mining-pool attribution was established over a window: share proven by view key, claimed by pool API, inferred from coinbase, or unattributed. window in 1h,6h,24h,48h,7d."""
    return await _get("/chain/provenance", {"window": _one_of(window, AGG_WINDOWS, "window")})


@mcp.tool()
async def get_block(hash: str) -> dict:
    """Full detail for one block by its 64-character block hash: height, previous hash, size, difficulty, reward, coinbase, transaction list and merge-mining tags."""
    h = hash.strip().lower()
    if len(h) != 64 or any(c not in "0123456789abcdef" for c in h):
        raise ValueError("hash must be a 64-character hex block hash; use search_block to look up a height")
    return await _get(f"/chain/block/{h}")


@mcp.tool()
async def search_block(query: str) -> dict:
    """Find a block by height (a number) or by 64-character hash, anywhere in the chain down to the genesis block (height 0). Returns the block detail plus whether it is canonical or an orphan."""
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


@mcp.tool()
async def chain_fork_window(to: int | None = None, limit: int = 100) -> dict:
    """Canonical chain plus any competing orphan blocks around a height. 'to' is the highest height in the window (defaults to the current tip); lower it to browse older history down to the genesis block. limit 10..500."""
    limit = max(10, min(int(limit), 500))
    params: dict = {"limit": limit}
    if to is not None:
        params["to"] = int(to)
    return await _get("/chain/fork-window", params)


@mcp.resource("monerometrics://reference")
async def reference() -> str:
    """Full plain-text reference for monerometrics: methodology, glossary, API and FAQ."""
    r = await _client.get("https://monerometrics.net/llms-full.txt")
    r.raise_for_status()
    return r.text


if __name__ == "__main__":
    mcp.run(transport=os.getenv("MCP_TRANSPORT", "streamable-http"))
