# monerometrics

> Infrastructure-as-Code for a reorg-aware Monero blockchain data service.

[![Terraform](https://img.shields.io/badge/Terraform-1.15-7B42BC?logo=terraform)](https://www.terraform.io/)
[![Azure](https://img.shields.io/badge/Cloud-Azure-0078D4?logo=microsoftazure)](https://azure.microsoft.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

`monerometrics` is the infrastructure repository powering a public service that delivers reliable, reorg-aware Monero blockchain data through a free dashboard and a paid API. The project was born from the May–August 2025 Qubic informational attack against Monero, which exposed how hard it can be for the community to obtain trustworthy chain data during and after a major reorg event.

This repository is fully **Infrastructure-as-Code**: every component, from the firewall to the SIEM, is provisioned through Terraform and configured through Ansible. The runtime workloads run on a hardened k3s cluster behind an OPNsense firewall with Suricata IDS/IPS.

---

## Architecture overview

- **Cloud**: Microsoft Azure, region France Central
- **Edge security**: OPNsense + Suricata IDS/IPS, nginx + ModSecurity (OWASP CRS 4.25 LTS) + CrowdSec
- **Compute**: k3s 3-node cluster on hardened Ubuntu 24.04 LTS
- **Data layer**: pruned `monerod` with reorg detection, PostgreSQL with Patroni HA
- **Identity & secrets**: Authentik (OIDC, MFA TOTP), OpenBao (community fork of Vault, MPL 2.0)
- **Observability**: Wazuh (SIEM/HIDS/XDR), Prometheus, Grafana, Loki, Grafana Alloy
- **Backups**: Restic encrypted snapshots to Azure Blob Storage

See [`docs/architecture/`](docs/architecture/) for full network diagrams, defense-in-depth model, and DevOps toolchain.

## Repository layout

```
infra/         Terraform (modules, environments, bootstrap)
config/        Ansible (inventory, playbooks, roles)
k8s/           Kubernetes manifests (base + overlays)
docs/          Architecture, EBIOS RM, PSSI, runbooks, captures
scripts/       Helpers (Azure env loader, deploy/destroy)
.github/       CI/CD workflows
```

## Design principles

1. **Production-grade by design, POC-sized at runtime.** All HA components (Patroni, multi-AZ monerod, 3-node databases) are fully implemented in code and can be scaled by flipping a Terraform variable. The default deployment runs a minimal footprint to fit a 50 $/month budget.
2. **Secrets never in code.** All credentials are stored in OpenBao or pulled from Azure Key Vault / macOS Keychain at runtime. Terraform state is stored remotely and encrypted.
3. **Idempotent infrastructure.** Anything provisioned with `terraform apply` can be reproduced from scratch in under 30 minutes.
4. **Open source where possible.** Active tracking of license changes — OpenBao replaced HashiCorp Vault after the BSL relicensing, Grafana Alloy replaced end-of-life Promtail.

## Quick start

> Requires a Mac/Linux workstation with the tools listed below, an Azure subscription, and an OpenBao or Keychain-based secret store.

```
# 1. Prerequisites
brew install terraform azure-cli ansible kubectl helm gh

# 2. Authenticate to Azure
source scripts/azure-env.sh    # loads SP credentials from macOS Keychain
az account show

# 3. Bootstrap (one-time): create resource group and remote state backend
cd infra/bootstrap
terraform init && terraform apply

# 4. Provision the POC environment
cd ../environments/poc
terraform init && terraform plan
terraform apply
```

## Status

This project is part of a French professional certification (Titre Professionnel niveau 6 — *Administrateur d'Infrastructures Sécurisées*). It is **not** production-ready as-is and should not be used to manage real Monero data without further hardening and audit.

## License

MIT — see [`LICENSE`](LICENSE).

---

**No advertising. No tracking. No data sold. Just blockchain data, done right.**
