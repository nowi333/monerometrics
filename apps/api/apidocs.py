"""Texte de la documentation OpenAPI, tenu a part du code des routes.

Module sans dependance : il ne manipule que le dictionnaire du schema, ce qui
le rend testable sans demarrer l'application.
"""

BASE = 'https://api.monerometrics.net'
SAMPLE_BLOCK = 'c5a428adf9022ebeba27415969f5259a98774e40e38bdc5f0fcdd7088f8b4fb2'

TAGS = [
    {'name': 'Service', 'description': 'Health of this API and of the index behind it.'},
    {'name': 'Network', 'description': 'Hashrate, block time, mempool, emission and fees.'},
    {'name': 'Chain', 'description': 'Blocks by height or hash, and how each was attributed to a pool.'},
    {'name': 'Reorgs and orphans', 'description': 'Chain reorganizations and orphan blocks this node observed live.'},
    {'name': 'Mining pools', 'description': 'Pool shares, and the pool APIs the attribution relies on.'},
    {'name': 'Price and Haveno', 'description': 'Centralized spot price against the Haveno peer-to-peer market.'},
]

# (methode, chemin) -> (rubrique, titre, description de repli, exemple).
# La description de repli ne sert que si la route n'a pas de docstring.
ROUTES = {
    ('get', '/health'): ('Service', 'Liveness check',
        'Liveness check and database connection status.', '/health'),
    ('get', '/info'): ('Service', 'Index totals',
        'Global metadata: API version, latest indexed height, total blocks, orphans and reorgs.', '/info'),
    ('get', '/status'): ('Service', 'Network verdict', '', '/status'),
    ('get', '/usage/external'): ('Service', 'External request counter',
        'External API requests served, excluding the dashboard and the MCP server. A single running total, nothing per client.',
        '/usage/external'),
    ('get', '/news'): ('Service', 'Monero news', '', '/news'),
    ('get', '/network/info'): ('Network', 'Current network state',
        'Sync status, mempool size, difficulty and estimated hashrate, read live from the node.', '/network/info'),
    ('get', '/network/hashrate'): ('Network', 'Hashrate history',
        'Network hashrate over the window, cut into about 300 points.', '/network/hashrate?window=7d'),
    ('get', '/network/blocktime'): ('Network', 'Block time history',
        'Time between consecutive canonical blocks over the window. The target is 120 seconds.',
        '/network/blocktime?window=24h'),
    ('get', '/network/mempool'): ('Network', 'Mempool history',
        'Mempool size over time. Buckets follow the history actually recorded, so a young series keeps its density.',
        '/network/mempool?window=24h'),
    ('get', '/network/emission'): ('Network', 'Emission history',
        'Average block reward over time, showing the tail emission of about 0.6 XMR per block.',
        '/network/emission?window=30d'),
    ('get', '/network/fees'): ('Network', 'Fee tiers', '', '/network/fees'),
    ('get', '/network/fees/history'): ('Network', 'Fee history', '', '/network/fees/history?window=30d'),
    ('get', '/chain/window'): ('Chain', 'Blocks between two heights',
        'Raw blocks between two heights, both included. At most 1000 blocks per request.',
        '/chain/window?from=3490000&to=3490010'),
    ('get', '/chain/block/{block_hash}'): ('Chain', 'Block detail', '', f'/chain/block/{SAMPLE_BLOCK}'),
    ('post', '/chain/search'): ('Chain', 'Find a transaction or a block by hash', '', None),
    ('get', '/chain/provenance'): ('Chain', 'Attribution provenance', '', '/chain/provenance?window=24h'),
    ('get', '/chain/fork-window'): ('Chain', 'Recent blocks with orphans',
        'The latest blocks, orphans included, each flagged when it is a fork point. `to` moves the top of the window down the chain.',
        '/chain/fork-window?limit=50'),
    ('get', '/reorgs'): ('Reorgs and orphans', 'Detected reorganizations',
        'Most recent reorganizations, newest first, with depth, fork point and number of displaced transactions.',
        '/reorgs?limit=20'),
    ('get', '/reorgs/stats'): ('Reorgs and orphans', 'Reorganization statistics',
        'Count, average and maximum depth over 24h, 7d, 30d, 90d and everything recorded, with the date watching began.',
        '/reorgs/stats'),
    ('get', '/orphans/recent'): ('Reorgs and orphans', 'Orphan blocks', '', '/orphans/recent?window=7d'),
    ('get', '/pools/distribution'): ('Mining pools', 'Pool shares',
        'Share of canonical blocks per mining pool over the window, with the Nakamoto coefficient.',
        '/pools/distribution?window=24h'),
    ('get', '/pools/latency'): ('Mining pools', 'Pool declaration delay', '', '/pools/latency?window=7d'),
    ('get', '/pools/sources'): ('Mining pools', 'Pool API reachability',
        'Reachability of the pool APIs used for block attribution.', '/pools/sources'),
    ('get', '/price'): ('Price and Haveno', 'XMR price', '', '/price'),
    ('get', '/price/spread'): ('Price and Haveno', 'Haveno spread history', '', '/price/spread?window=30d'),
    ('get', '/haveno/book'): ('Price and Haveno', 'Haveno order book', '', '/haveno/book'),
    ('get', '/haveno/methods'): ('Price and Haveno', 'Haveno premium by payment method', '',
        '/haveno/methods?window=90d&currency=USD'),
    ('get', '/haveno/liquidity'): ('Price and Haveno', 'Haveno liquidity history', '',
        '/haveno/liquidity?window=30d&currency=USD'),
    ('get', '/haveno/trades'): ('Price and Haveno', 'Recent Haveno trades', '',
        '/haveno/trades?limit=20&currency=EUR'),
}

RATE_HEADERS = {
    'RateLimit-Limit': 'Requests allowed per minute for this client.',
    'RateLimit-Remaining': 'Requests left in the current window.',
    'RateLimit-Reset': 'Seconds until the window frees a slot.',
}


def description(rate_limit: int) -> str:
    return f"""Free, read-only JSON API over a reorg-aware Monero index: chain reorganizations, orphan blocks, mining-pool shares with the evidence behind each attribution, network series and the Haveno market. No key, no account.

## Quick start

```bash
curl -s {BASE}/status
curl -s "{BASE}/pools/distribution?window=24h"
```

Every endpoint below comes with a command that runs as is.

## Rate limit

{rate_limit} requests per minute per IP address, over a sliding window. Every response says where you stand:

| Header | Meaning |
|---|---|
| `RateLimit-Limit` | requests allowed per minute |
| `RateLimit-Remaining` | requests left in the current window |
| `RateLimit-Reset` | seconds until a slot frees up |

Past the limit the API answers `429` with a `Retry-After` header, in seconds.

## Caching

Aggregates are recomputed once per period, so polling faster returns the same bytes. Responses carry `Cache-Control` and an `ETag`: send it back in `If-None-Match` and an unchanged answer costs an empty `304`.

## Errors

Errors are JSON with a `detail` field. `400` for a range the endpoint refuses, `404` for a block or hash that is not known, `422` for a malformed parameter, `429` past the rate limit.

## Reading the data

- A block's pool is labelled by evidence: `viewkey_proof`, `pool_api`, `coinbase_heuristic` or none. A claimed attribution is not a proven one.
- Full indexing coverage starts at height 3490000. Below it only the canonical chain is known and pool attribution is mostly absent.
- Reorganizations and orphans only cover what this node observed live.

## Other interfaces

- [Changelog]({BASE}/changelog)
- [OpenAPI schema]({BASE}/openapi.json), [ReDoc]({BASE}/redoc)
- Model Context Protocol server: `{BASE}/mcp`
- [llms.txt]({BASE}/llms.txt)
- Source: [github.com/nowi333/monerometrics](https://github.com/nowi333/monerometrics)
"""


def curl(method: str, example: str | None) -> str:
    if method == 'post':
        return (f"curl -s -X POST {BASE}/chain/search \\\n"
                f"  -H 'Content-Type: application/json' \\\n"
                f"  -d '{{\"query\": \"{SAMPLE_BLOCK}\"}}'")
    return f'curl -s "{BASE}{example}"'


def enrich(schema: dict) -> dict:
    """Complete le schema genere : rubrique, titre, description, commande
    d'exemple et reponse 429 pour chaque route publique."""
    headers = {name: {'description': text, 'schema': {'type': 'integer'}}
               for name, text in RATE_HEADERS.items()}
    components = schema.setdefault('components', {})
    components.setdefault('responses', {})['RateLimited'] = {
        'description': 'Rate limit exceeded. Wait `Retry-After` seconds.',
        'headers': {**headers,
                    'Retry-After': {'description': 'Seconds to wait before retrying.',
                                    'schema': {'type': 'integer'}}},
        'content': {'application/json': {'example': {'detail': 'Too many requests'}}},
    }
    for path, operations in schema.get('paths', {}).items():
        for method, op in operations.items():
            doc = ROUTES.get((method, path))
            if not doc:
                continue
            tag, summary, fallback, example = doc
            op['tags'] = [tag]
            op['summary'] = summary
            text = (op.get('description') or fallback).strip()
            command = curl(method, example)
            op['description'] = '\n\n'.join(filter(None, [text, f'```bash\n{command}\n```']))
            op['x-codeSamples'] = [{'lang': 'Shell', 'label': 'curl', 'source': command}]
            op.setdefault('responses', {})['429'] = {'$ref': '#/components/responses/RateLimited'}
            ok = op['responses'].get('200')
            if ok is not None:
                ok.setdefault('headers', {}).update(headers)
    return schema
