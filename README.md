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

> **From a diploma project to a community tool.** monerometrics V1 was built and defended as
> the supporting project of a French professional qualification (*Administrateur
> d'Infrastructures Sécurisées*, RNCP level 6) — and it earned the diploma. With the exam now
> behind it, the goal of V2 is to hand the project over to the **Monero community**: fully
> open-source, self-funded, and useful well beyond a classroom.

---

## What it does

- **Dashboard** ([monerometrics.net](https://monerometrics.net)) — React SPA: hashrate, block-time
  variance, mempool, mining-pool distribution, a chain-fork visualizer and reorg/orphan history.
  FR / EN / ES.
- **Public API** ([api.monerometrics.net](https://api.monerometrics.net)) — FastAPI, 11 read-only
  JSON endpoints (service, network, chain/reorgs, pools). OpenAPI documented.
- **Reorg detection** — a Python worker reads each block from a synced node, computes the
  indicators and records reorganizations by comparing the current chain state to the stored one.

## Architecture (real, as deployed)

This describes the **POC that actually ran**, not an idealized target. Clean, up-to-date
architecture diagrams will be added once the stack is redeployed on Hetzner.

- **Cloud**: Microsoft Azure (IaaS) for the POC — **currently being migrated to Hetzner** for cost.
  Oracle Cloud (OCI) hosts the SIEM and the off-site backups.
- **Three servers** (Ubuntu 24.04 LTS), each in an isolated subnet with its own firewall:
  - `bastion` — sole SSH entry point (ProxyJump to the others)
  - `edge` — only public web face (80/443): nginx reverse proxy + **ModSecurity WAF**
    (OWASP CRS 4.25). Also serves the React dashboard as static files.
  - `k3s` — application core, no public IP: `monerod`, worker, PostgreSQL, API, OpenBao.
- **Containerized core** (in k3s): `monerod` 0.18 (pruned), Python worker, PostgreSQL 17, FastAPI.
- **Private network**: Tailscale (WireGuard), zero-trust admin — Grafana and Wazuh are reachable
  over Tailscale only, never from the internet.
- **DNS / TLS**: Cloudflare (proxied) + Let's Encrypt (wildcard via DNS-01).
- **Secrets**: OpenBao (free fork of Vault). **Supervision**: Prometheus + Grafana.
  **SIEM**: Wazuh (on OCI). **Backups**: Restic, encrypted, cross-cloud to OCI (3-2-1).

Everything is **Infrastructure-as-Code**: Azure resources via Terraform, server configuration
and hardening (CIS L1) via Ansible. A `deployment_mode` variable (`poc` | `prod`) scales the
sizing and redundancy without changing the deployment logic.

> **Status**: the POC was built, deployed and operated end-to-end on Azure; the cloud resources
> were then torn down to stop costs. The codebase is being cleaned up and ported to Hetzner.
> It is not currently live.

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

2. **Forward indexing.** It then fetches the new blocks above the last indexed height, in
   batches of `MAX_BLOCKS_PER_BATCH`, and upserts them as canonical.

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

## Repository layout

```
apps/          Application code
  dashboard/   React + Vite SPA (FR/EN/ES)
  api/         FastAPI service
  worker/      Python indexer (reorg detection)
infra/         Terraform (modules, environments, bootstrap)
config/        Ansible (inventory, playbooks, roles)
k8s/           Kubernetes (k3s) manifests
scripts/       Helpers (env loader)
```

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
  runtime (`scripts/azure-env.sh`) or stored in OpenBao. Terraform state is remote and encrypted.
- Defense in depth: NSG/firewall segmentation, SSH bastion, WAF, zero-trust admin mesh,
  risk analysis (EBIOS RM) and a tested cross-cloud disaster-recovery plan.

## Support the project

monerometrics runs on a modest self-funded infrastructure (no ads, no tracking, no data sold).
A Monero donation address is available on the dashboard.

## License

MIT — see [`LICENSE`](LICENSE).

---

**No advertising. No tracking. No data sold. Just Monero network data, done honestly.**
