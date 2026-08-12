# monerometrics MCP server

A [Model Context Protocol](https://modelcontextprotocol.io) server that lets AI
assistants and agents query the Monero network through monerometrics, live. It is a
thin, read-only wrapper over the public REST API (`api.monerometrics.net`): no state,
no writes, no secrets.

## Public endpoint

```
https://api.monerometrics.net/mcp
```

Transport: **Streamable HTTP** (stateless, JSON responses). No account, no API key.

### Add it to Claude Code

```bash
claude mcp add --transport http monerometrics https://api.monerometrics.net/mcp
```

### Add it to Claude Desktop / other MCP clients

```json
{
  "mcpServers": {
    "monerometrics": {
      "type": "http",
      "url": "https://api.monerometrics.net/mcp"
    }
  }
}
```

Then ask things like *"what is Monero's current Nakamoto coefficient?"*, *"were there
any chain reorgs this week?"*, or *"who mined block 3689996?"* and the assistant calls
the tools directly.

## Tools

| Tool | What it returns |
| --- | --- |
| `network_info` | Height, difficulty, network hashrate, mempool size |
| `price` | XMR price (official spot + Haveno reference) |
| `network_hashrate(window)` | Hashrate time series (1h,24h,7d,30d,90d,1y,5y) |
| `network_blocktime(window)` | Block-time variance time series |
| `network_mempool(window)` | Mempool size time series |
| `network_emission(window)` | Block reward / emission time series |
| `reorgs` | Detected chain reorganizations |
| `reorg_stats` | Reorg counts, depth, affected transactions |
| `recent_orphans(limit)` | Recent orphan blocks + their canonical counterpart |
| `pool_distribution(window)` | Pool block shares, largest-pool share, Nakamoto coefficient (1h,6h,24h,48h,7d) |
| `pool_sources` | Reachability of each pool API used for attribution |
| `chain_provenance(window)` | How pool attribution was established over a window |
| `get_block(hash)` | Full detail for one block by 64-char hash |
| `search_block(query)` | Find a block by height or hash, down to the genesis block |
| `chain_fork_window(to, limit)` | Canonical chain plus competing orphans around a height |

Resource: `monerometrics://reference` — the full plain-text project reference
(`llms-full.txt`).

## Local development

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
MCP_TRANSPORT=stdio python server.py   # stdio, for local MCP clients
python server.py                        # Streamable HTTP on :8080 (default)
```

Environment:

- `MM_API_BASE` — REST API base (default `https://api.monerometrics.net`).
- `MCP_TRANSPORT` — `streamable-http` (default) or `stdio`.
- `MCP_HOST`, `MCP_PORT` — bind address for HTTP transport (default `0.0.0.0:8080`).

## Tests / audit

`test_client.py` spawns the server over stdio, lists tools, calls them, checks input
validation, and audits that MCP output matches the REST API:

```bash
python test_client.py
```

## Deployment

Runs as a small Deployment + Service in the `monerometrics` namespace (`deploy.yaml`),
behind Traefik. A Traefik `IngressRoute` maps `api.monerometrics.net/mcp` to the
service, reusing the existing domain and TLS certificate. Responses are plain JSON
(`json_response`), which is why it works cleanly behind the edge reverse proxy without
any SSE-specific proxy tuning.
