# Changelog

Changes visible to users of the public API, newest first. The running version
is reported by `GET /info`.

## 0.33.1 - 2026-11-25

- Text pages carry the same logo as the dashboard.

## 0.33.0 - 2026-11-25

- `GET /confirmations/recommended?amount_usd=`: how many confirmations to
  wait for a payment, from the largest pool's share and the deepest reorg
  observed. Updates on its own as mining concentrates or spreads.
- `GET /haveno/index`: the monerometrics Haveno Premium Index, volume-weighted
  median premium of executed Haveno trades over spot, current and weekly, with
  reversible and final sub-indices.
- `GET /reports/{yyyy-mm}`: monthly State of Monero mining report (pool
  shares, Nakamoto coefficient, attribution, reorgs, orphans, hashrate, Haveno
  premium), with the previous month for comparison.

## 0.32.1 - 2026-11-25

- Discovery for agents: `/.well-known/ai-catalog.json` (also `ard.json`)
  lists every interface, `/pricing` states the free tier and the rate limit,
  and `/.well-known/security.txt` gives a security contact.
- `/v1/message:send` and `/graphql` answer `501` with pointers to the REST,
  MCP and A2A interfaces instead of a bare `404`.

## 0.32.0 - 2026-11-24

- `GET /thorchain/status`: whether native XMR is live on THORChain (pool,
  inbound vault, halts), refreshed every 10 minutes. Swap flows will follow
  once the chain is live.

## 0.31.8 - 2026-11-10

- Every response carries `RateLimit-Limit`, `RateLimit-Remaining` and
  `RateLimit-Reset`. `Retry-After` on a `429` is now the real wait, not a
  fixed 60 seconds.
- OpenAPI: every endpoint has a title, a description, a runnable `curl`
  example and a documented `429`. Endpoints are grouped by topic.
- This changelog, served at `/changelog`.
- `/info` reports the running version again.

## 0.31.7 - 2026-11-10

- Fixed a memory leak that restarted the API about once a day.

## 2026-11-09

- Plain HTML pages for blocks, pools, hashrate, fees and Haveno, with a
  sitemap.
- SVG badges: `/badge/{status,nakamoto,top-pool,hashrate,last-reorg}.svg`.

## 2026-11-04

- `/status` serves the last verdict while it recomputes instead of blocking.

## 2026-09-23

- Alternative blocks are recorded as the node sees them.
- A route that reports a missing block or hash keeps its own `404` message.
- `/price` serves the last known price while it refreshes.

## 2026-09-22

- `/reorgs/stats`: windows up to everything recorded, with the date watching
  began.
- Series endpoints: finer buckets on short windows, daily buckets up to five
  years.

## 2026-09-21

- `/orphans/recent` takes a time `window` instead of a fixed count.
- `/pools/latency`: how long each pool takes to claim a block it mined.
- `/news`: three sources, last seven days, each item tagged with its origin.
- Responses carry `Cache-Control` and `ETag`, and answer `304` to
  `If-None-Match`.

## 2026-09-10

- `POST /chain/search`: resolve a hash to a transaction or a block.

## 2026-09-07

- `/status`: one-line verdict with every threshold that produced it.
- `/news`.

## 2026-08-27

- `/haveno/book`: live order book, served from the last snapshot when the
  upstream feed is down, with the snapshot age.

## 2026-08-24

- `/network/fees` and `/network/fees/history`.
- `/price/spread`, `/haveno/methods`, `/haveno/liquidity`, `/haveno/trades`.
- Unknown paths answer with the list of interfaces that exist.

## 2026-08-17

- Agent discovery: `/llms.txt`, agent card, MCP server card.

## 2026-08-12

- `/usage/external`: count of external requests served.

## 2026-07-23

- First public release: `/health`, `/info`, `/chain/window`,
  `/chain/block/{hash}`, `/chain/provenance`, `/chain/fork-window`, `/reorgs`,
  `/reorgs/stats`, `/orphans/recent`, `/pools/distribution`, `/pools/sources`,
  `/price` and the `/network/*` series.
