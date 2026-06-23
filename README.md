# monerometrics

> A reorg-aware observatory for the health of the Monero network — public dashboard + API.

[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![IaC](https://img.shields.io/badge/IaC-Terraform%20%2B%20Ansible-7B42BC?logo=terraform)](https://www.terraform.io/)
[![Monero](https://img.shields.io/badge/Monero-XMR-FF6600?logo=monero)](https://www.getmonero.org/)

`monerometrics` measures and historizes the health of the Monero network: network hashrate,
block time, mempool state, mining-pool distribution and — above all — **chain reorganizations
(reorgs) and orphan blocks**, which most block explorers surface poorly.

The project was born from the **August 2025 Qubic episode**, during which a mining pool
approached a majority of the network hashrate and triggered reorganizations, raising concerns
about Monero's resilience. The public debate lacked reliable, accessible data to settle it.
monerometrics fills that gap with a neutral, verifiable, reorg-aware observatory.

It is **open-source and self-funded**, with no ads and no tracking. The dashboard and the
community API stay free; a future freemium tier would only cover intensive commercial usage.

> **From a diploma project to a community tool.** monerometrics V1 was built and defended as a
> French professional IT-infrastructure project — and it earned the diploma. With that chapter
> closed, the goal of V2 is to hand the project over to the **Monero community**: fully
> open-source, self-funded, and useful well beyond a classroom.

- **Dashboard** — [monerometrics.net](https://monerometrics.net)
- **Public API** — [api.monerometrics.net](https://api.monerometrics.net) (OpenAPI documented)

---

## What it does

- **Dashboard** — React SPA: network hashrate, block-time variance, mempool history, block
  reward / emission, mining-pool distribution with **centralization metrics (largest-pool share
  and Nakamoto coefficient)**, an interactive chain-fork visualizer and reorg/orphan history.
  Available in **English, French and Spanish**, light/dark themes.
- **Public API** — FastAPI, 13 read-only JSON endpoints grouped by theme (service, network,
  chain/reorgs, pools). Automatically documented via OpenAPI.
- **Reorg detection** — a Python worker reads each block from a synced node, computes the
  indicators and **detects reorganizations** by re-checking a rolling window of recent blocks
  against the node, recording their real depth and the transactions they displaced.

## Architecture

A visitor reaches the dashboard or API through Cloudflare, which terminates TLS and applies its
edge protections, then forwards to a hardened **edge** server (nginx + ModSecurity WAF). The
edge serves the static dashboard and reverse-proxies the API to the **k3s** node, where the
application core runs: a Monero node, the indexer, PostgreSQL and the API.

```mermaid
flowchart LR
    User(["Visitor"]) -->|HTTPS| CF["Cloudflare<br/>DNS · WAF · proxy"]
    CF -->|"HTTP/1.1 origin pull"| Edge
    subgraph HZ["Hetzner Cloud · private network 10.0.0.0/24"]
        Edge["edge 10.0.0.20<br/>nginx + ModSecurity WAF<br/>static dashboard"]
        subgraph K3S["k3s 10.0.0.30 · no public ingress"]
            API["FastAPI"]
            Worker["Python worker<br/>(indexer)"]
            DB[("PostgreSQL 17")]
            Node["monerod 0.18<br/>pruned"]
        end
        Edge -->|"api. proxy_pass"| API
        API --> DB
        Worker --> DB
        Worker -->|JSON-RPC| Node
    end
    Node <-->|"P2P sync"| Monero(["Monero network"])
```

## Infrastructure

The platform runs on **Hetzner Cloud** (region Nuremberg) as three Ubuntu 24.04 servers on a
private network, each protected by its own Hetzner firewall. Administration is done over a
**Tailscale** (WireGuard) zero-trust mesh; Grafana and the Wazuh SIEM are reachable over
Tailscale only, never from the internet. The SIEM and the encrypted off-site backups live on a
separate cloud (**Oracle Cloud**, free tier) to isolate failure domains.

```mermaid
flowchart TB
    Admin(["Administrator"]) -->|"SSH 22"| Bastion
    Internet(["Internet"]) -->|"80 / 443"| Edge
    subgraph HZ["Hetzner Cloud (nbg1) · 10.0.0.0/24"]
        Bastion["bastion 10.0.0.10<br/>firewall: SSH from admin IP only"]
        Edge["edge 10.0.0.20<br/>firewall: 80/443 from internet"]
        K3s["k3s 10.0.0.30 + data volume<br/>firewall: no inbound"]
        Bastion -. ProxyJump .-> Edge
        Bastion -. ProxyJump .-> K3s
    end
    Mesh["Tailscale mesh<br/>(admin · Grafana · agents)"]
    Bastion --- Mesh
    Edge --- Mesh
    K3s --- Mesh
    subgraph OCI["Oracle Cloud · free tier"]
        Wazuh["Wazuh SIEM"]
        Backups[("Restic backups<br/>S3-compatible, encrypted")]
    end
    K3s -->|"3-2-1 encrypted"| Backups
    K3s -.->|"agents 1514"| Wazuh
    Edge -.->|"agents 1514"| Wazuh
    Bastion -.->|"agents 1514"| Wazuh
```

| Server | Type | Public exposure | Role |
|---|---|---|---|
| `bastion` | CX22 | SSH from admin IP only | Sole SSH entry point, ProxyJump to the others |
| `edge` | CX22 | 80/443 from the internet | nginx reverse proxy + ModSecurity WAF, serves the static dashboard |
| `k3s` | CX32 + 128 GB volume | none (outbound only) | k3s cluster: monerod, worker, PostgreSQL, API, OpenBao |

Key choices:

- **Defense in depth.** Per-server firewalls, a single SSH entry point, a WAF on the only public
  web surface, a zero-trust admin mesh, and a k3s node with **no inbound exposure at all**
  (admin and edge reach it over the private network; its public IP is outbound-only, for node
  sync and image pulls).
- **HTTP/1.1 origin behind Cloudflare.** Cloudflare serves HTTP/2 and HTTP/3 to clients; the
  Cloudflare-to-origin hop stays HTTP/1.1, which keeps the ModSecurity WAF fully active.
- **Everything is Infrastructure-as-Code.** Hetzner resources via **Terraform**
  (`hcloud` + `cloudflare` providers), server configuration and CIS-aligned hardening via
  **Ansible**. Container images are built and published to GHCR.
- **Secrets** are managed with **OpenBao** (a free fork of Vault); supervision with
  **Prometheus + Grafana**; detection with **Wazuh**; backups with **Restic** (3-2-1,
  cross-cloud).

## How the indexer works

The worker ([`apps/worker/indexer.py`](apps/worker/indexer.py)) is the heart of the project. Every
`POLL_INTERVAL` seconds it asks `monerod` for its state (`/get_info`) and, when the node is
synced, runs **two passes** against the database:

1. **Confirmation-window rescan (reorg detection).** It re-fetches the headers of the last
   `CONFIRMATION_WINDOW` blocks (default 60) in a single `get_block_headers_range` call and
   compares each block hash to the canonical hash already stored. Any mismatch is a
   reorganization: the previously stored block is flagged **orphan** (`is_canonical = false`),
   the node's new block becomes canonical, and a row is written to `reorgs_detected` with the
   **real depth** (number of contiguous rewritten heights) and **affected transaction count**
   (sum of the orphaned blocks' tx counts). This pass is what makes reorg detection actually
   work — plain forward-only indexing never revisits the past, so it would silently miss every
   reorg that rewrites already-indexed heights.

2. **Forward indexing.** It then fetches the new blocks above the last indexed height. Close to
   the tip it pulls **full blocks** one by one for accurate pool attribution; when it is far
   behind (fresh deploy), it switches to a **fast header backfill** (`get_block_headers_range`,
   ~1000 blocks per call), which is enough for the network-health series and lets the long
   windows (90 d, 1 y, 5 y) fill with real history in well under two hours instead of never.

```mermaid
flowchart TB
    Start(["Every POLL_INTERVAL"]) --> Info["GET /get_info"]
    Info --> Sync{"node synced?"}
    Sync -->|no| Wait["log progress · sleep"]
    Sync -->|yes| Rescan["Rescan last N blocks<br/>get_block_headers_range"]
    Rescan --> Diff{"stored hash<br/>≠ node hash?"}
    Diff -->|yes| Reorg["mark old → orphan<br/>insert new canonical<br/>record reorg (depth, tx)"]
    Diff -->|no| Fwd
    Reorg --> Fwd["Forward index<br/>new blocks (batch)"]
    Fwd --> Metrics["update Prometheus metrics"]
    Metrics --> Start
```

**Mining-pool attribution** ([`apps/worker/pools.py`](apps/worker/pools.py)) cross-references each
block hash against an index `{block_hash → pool}` aggregated every 5 minutes from the public
block lists of the major pools (supportxmr, p2pool, hashvault, moneroocean, c3pool, nanopool,
kryptex, herominers). If a hash isn't found, a structural P2Pool heuristic (multi-output
coinbase) is tried; otherwise the block is `unknown`. Coverage is ~95%, the same ceiling as
public aggregators — Monero's privacy means centralized pools don't sign their coinbase on-chain.

**Observability.** The worker exposes Prometheus metrics on `:9100/metrics` (indexing lag, reorg
counter, sync state, pool-index size, last-loop timestamp) and writes a heartbeat file consumed
by a Kubernetes liveness probe, so a stalled loop gets restarted automatically.

## Data model

Two tables in PostgreSQL ([`k8s/monerometrics/20-configmap-postgres-init.yaml`](k8s/monerometrics/20-configmap-postgres-init.yaml)),
read-only from the API's point of view:

- **`blocks`** — the primary key is the **block hash**, *not* the height. This is deliberate: it
  lets several blocks coexist at the same height (the canonical one plus the orphans left behind
  by a reorg). A **partial unique index** (`UNIQUE (height) WHERE is_canonical`) guarantees there
  is exactly one canonical block per height at any instant. Columns include `height`, `prev_hash`,
  timestamps, `difficulty`, `tx_count`, `miner_pool`, `reward_xmr` (stored as an exact `NUMERIC`,
  not a float) and the `is_canonical` flag.
- **`reorgs_detected`** — one row per detected reorganization event: `fork_point_height`, `depth`,
  `old_chain_tip_hash`, `new_chain_tip_hash`, `affected_tx_count` and `detected_at`.

The orphan/canonical split is what powers the dashboard's chain-fork visualizer and the
`/orphans/recent` and `/reorgs/stats` endpoints.

## API reference

The API ([`apps/api/`](apps/api/)) is **read-only** and returns JSON. It is built with FastAPI,
so an interactive OpenAPI schema is served at
[`api.monerometrics.net/docs`](https://api.monerometrics.net/docs) (raw schema at `/openapi.json`).
Responses for the heavy aggregations are cached (~60 s) and every IP is rate-limited
(120 requests/minute by default); CORS is open for `GET` so the API can be consumed from
anywhere. No key, no account, no tracking.

`window` accepts `1h`, `24h`, `7d`, `30d`, `90d`, `1y`, `5y` unless noted otherwise.

**Service**

| Endpoint | Description |
|---|---|
| `GET /health` | Liveness + database connectivity check. |
| `GET /info` | Global metadata: API version, latest indexed height, total blocks, orphans, reorgs. |

**Network**

| Endpoint | Description |
|---|---|
| `GET /network/info` | Current state: sync status, mempool size, difficulty, estimated hashrate (live from the node). |
| `GET /network/hashrate?window=` | Historical network hashrate (difficulty / 120 s), bucketed by the window. |
| `GET /network/blocktime?window=` | Variance of the time between consecutive canonical blocks (target 120 s). `window` = `1h\|24h\|7d\|30d`. |
| `GET /network/mempool?window=` | Mempool size (pending transactions) over time, sampled each worker poll. |
| `GET /network/emission?window=` | Average block reward over time — Monero tail emission (~0.6 XMR/block). `window` excludes `1h`. |

**Chain & reorgs**

| Endpoint | Description |
|---|---|
| `GET /chain/window?from=&to=` | Raw block window between two heights (max 1000 blocks). |
| `GET /chain/fork-window?limit=` | Latest N blocks including orphans, with fork-point flags (powers the chain visualizer). `limit` = 10..500. |
| `GET /reorgs?limit=` | Most recent detected reorganizations. `limit` = 1..1000. |
| `GET /reorgs/stats` | Reorg statistics aggregated over 24h / 7d / 30d (count, avg/max depth, affected tx). |
| `GET /orphans/recent?limit=` | Recent orphan blocks with their competing canonical block. `limit` = 1..500. |

**Mining pools**

| Endpoint | Description |
|---|---|
| `GET /pools/distribution?window=` | Block share per pool over the window, plus decentralization metrics: largest-pool share and **Nakamoto coefficient**. `window` = `1h\|6h\|24h\|48h\|7d`. |

## Repository layout

```
apps/          Application code
  dashboard/   React + Vite SPA (EN/FR/ES)
  api/         FastAPI service
  worker/      Python indexer (reorg detection) + shared pool module
infra/         Terraform — modules (network, server, dns) + environments
config/        Ansible — inventory, playbooks, roles (hardening, nginx, k3s, ...)
k8s/           Kubernetes (k3s) manifests
scripts/       Helpers (env loader)
```

## Deploying

The whole platform is reproducible from code. With a Hetzner project, a Cloudflare-managed
domain and the required tokens in your environment:

```bash
# 1. Load tokens (HCLOUD_TOKEN, CLOUDFLARE_API_TOKEN, TAILSCALE_AUTH_KEY, GHCR) from the keychain
source scripts/load-env.sh

# 2. Provision the servers, private network, firewalls and DNS records
cd infra/environments/poc
terraform init
terraform apply        # creates bastion, edge, k3s + Cloudflare A records

# 3. Configure and harden the servers (CIS L1, nginx+WAF, k3s, data volume, Tailscale)
cd ../../../config/ansible
ansible-playbook site.yml

# 4. Deploy the application workloads on k3s
kubectl apply -k k8s/monerometrics/
```

Server sizing, datacenter and the data-volume size are Terraform variables
(see [`infra/environments/poc/terraform.tfvars.example`](infra/environments/poc/terraform.tfvars.example)).

**Secrets are managed by OpenBao only** — there is no plaintext credential in the cluster
manifests. Seed the database credentials once, and every consumer (PostgreSQL, worker, API,
backup) reads them from there:

```bash
bao kv put secret/postgres/credentials \
  POSTGRES_USER=monerometrics POSTGRES_DB=monerometrics POSTGRES_PASSWORD='<strong-password>'
```

The OpenBao Kubernetes auth roles `monerometrics-postgres`, `monerometrics-worker`,
`monerometrics-api` and `monerometrics-backup` must each be allowed to read that path.

## Local development (dashboard)

```bash
cd apps/dashboard
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
```

The dashboard reads the public API; point it at `api.monerometrics.net` (see `src/api.js`).

## Security & secrets

- **No secret in the repo.** Credentials are pulled from the macOS Keychain / environment at
  runtime (`scripts/load-env.sh`) or stored in OpenBao. Terraform state is kept out of the repo.
- Defense in depth: firewall segmentation, SSH bastion, WAF, zero-trust admin mesh, risk analysis
  (EBIOS RM) and a tested cross-cloud disaster-recovery plan.

## Support the project

monerometrics runs on a modest self-funded infrastructure (no ads, no tracking, no data sold).
A Monero donation address is available on the dashboard.

## License

MIT — see [`LICENSE`](LICENSE).

---

**No advertising. No tracking. No data sold. Just Monero network data, done honestly.**
