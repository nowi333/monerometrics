# OpenBao — re-init & unseal

OpenBao (Vault-compatible) uses a Shamir seal. Its unseal key must survive
operator turnover, so it is kept in the **macOS Keychain**, never in the repo.

## One-time re-initialization

Run once on the operator's Mac (needs `ssh <host>` reaching the cluster and
`sudo kubectl` on it):

```bash
bash scripts/openbao-reinit.sh
```

It scales OpenBao down, wipes the raft PVC, brings it back up empty,
initializes it with a single key share (threshold 1), stores the **unseal key**
and **root token** in the Keychain (services `openbao-unseal-key` and
`openbao-root-token`, account `monerometrics`), and unseals. The key is piped
straight into the Keychain and into `bao operator unseal -` over stdin — it is
never printed.

## Re-unseal after a restart

An OpenBao pod restart re-seals it. Restore access with:

```bash
bash scripts/openbao-unseal.sh
```

It reads the key from the Keychain and unseals over stdin. No secret ever
appears on screen or on disk.

## Overrides

- `OPENBAO_SSH_HOST` — SSH alias for the cluster (default `monero-k3s`).
- `OPENBAO_KEYCHAIN_ACCOUNT` — Keychain account (default `monerometrics`).

## Notes

- The app workloads (`api`, `worker`, `postgres`) read their Postgres
  credentials from the plain Kubernetes Secret `postgres-credentials-fallback`,
  not from OpenBao. That keeps them resilient to a sealed OpenBao — a pod
  restart never blocks on an unseal. Re-wiring them onto OpenBao is a separate,
  optional step and should only be done alongside an auto-unseal mechanism.
- The Mac Keychain cannot unseal the cluster automatically on reboot; "durable"
  here means the key is never lost and re-unsealing is a single command.
