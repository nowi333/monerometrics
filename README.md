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
