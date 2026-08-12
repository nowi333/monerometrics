import asyncio
import json
import os
import sys
import httpx
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

API_BASE = os.getenv("MM_API_BASE", "https://api.monerometrics.net").rstrip("/")

EXPECTED_TOOLS = {
    "network_info", "price", "network_hashrate", "network_blocktime",
    "network_mempool", "network_emission", "reorgs", "reorg_stats",
    "recent_orphans", "pool_distribution", "pool_sources", "chain_provenance",
    "get_block", "search_block", "chain_fork_window",
}


def _content_json(result):
    parts = []
    for c in result.content:
        if getattr(c, "type", None) == "text":
            parts.append(c.text)
    text = "".join(parts)
    try:
        return json.loads(text)
    except Exception:
        return text


async def main():
    params = StdioServerParameters(
        command=sys.executable,
        args=["server.py"],
        env={**os.environ, "MCP_TRANSPORT": "stdio"},
    )
    passed, failed = 0, 0

    def ok(name, cond, detail=""):
        nonlocal passed, failed
        if cond:
            passed += 1
            print(f"  PASS  {name} {detail}")
        else:
            failed += 1
            print(f"  FAIL  {name} {detail}")

    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            init = await session.initialize()
            print(f"server: {init.serverInfo.name} v{init.serverInfo.version}")

            tools = await session.list_tools()
            names = {t.name for t in tools.tools}
            print(f"\ntools exposed ({len(names)}): {sorted(names)}")
            ok("tool set", EXPECTED_TOOLS <= names, f"missing={EXPECTED_TOOLS - names}")
            for t in tools.tools:
                ok(f"schema:{t.name}", bool(t.description) and t.inputSchema is not None)

            resources = await session.list_resources()
            print(f"\nresources: {[str(r.uri) for r in resources.resources]}")

            print("\n== calling tools ==")
            r = _content_json(await session.call_tool("network_info", {}))
            ok("network_info", isinstance(r, dict) and "block_height" in r,
               f"height={r.get('block_height') if isinstance(r, dict) else r}")

            r = _content_json(await session.call_tool("pool_distribution", {"window": "24h"}))
            ok("pool_distribution", isinstance(r, dict) and "nakamoto_coefficient" in r,
               f"nakamoto={r.get('nakamoto_coefficient') if isinstance(r, dict) else r}")

            r = _content_json(await session.call_tool("reorg_stats", {}))
            ok("reorg_stats", isinstance(r, dict) and "windows" in r)

            r = _content_json(await session.call_tool("recent_orphans", {"limit": 5}))
            ok("recent_orphans", isinstance(r, dict) and "orphans" in r,
               f"count={len(r.get('orphans', [])) if isinstance(r, dict) else '?'}")

            r = _content_json(await session.call_tool("network_hashrate", {"window": "7d"}))
            ok("network_hashrate", isinstance(r, dict) and "points" in r)

            r = _content_json(await session.call_tool("search_block", {"query": "0"}))
            ok("search_block(genesis)", isinstance(r, dict) and r.get("height") == 0,
               f"hash={r.get('hash', '')[:16] if isinstance(r, dict) else r}...")
            genesis_hash = r.get("hash") if isinstance(r, dict) else None

            if genesis_hash:
                r = _content_json(await session.call_tool("get_block", {"hash": genesis_hash}))
                ok("get_block(hash)", isinstance(r, dict) and r.get("height") == 0)

            async with httpx.AsyncClient(base_url=API_BASE, timeout=20) as c:
                rest = (await c.get("/network/info")).json()
                mcp_r = _content_json(await session.call_tool("network_info", {}))
                ok("audit:network_info==REST",
                   isinstance(mcp_r, dict) and mcp_r.get("difficulty") == rest.get("difficulty"),
                   f"difficulty={rest.get('difficulty')}")
                rp = (await c.get("/pools/distribution", params={"window": "24h"})).json()
                mp = _content_json(await session.call_tool("pool_distribution", {"window": "24h"}))
                ok("audit:pool_distribution==REST",
                   isinstance(mp, dict) and mp.get("nakamoto_coefficient") == rp.get("nakamoto_coefficient"),
                   f"nakamoto={rp.get('nakamoto_coefficient')}")

            r = await session.call_tool("network_hashrate", {"window": "bogus"})
            ok("validation:bad window", r.isError is True)
            r = await session.call_tool("get_block", {"hash": "notahash"})
            ok("validation:bad hash", r.isError is True)

    print(f"\n== {passed} passed, {failed} failed ==")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    asyncio.run(main())
