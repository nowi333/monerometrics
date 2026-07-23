# Manifests Kubernetes monerometrics

Manifests deploys sur le cluster k3s single-node POC.

## Structure

- `storage/` : Configuration du provisioner local-path (pointe sur le volume de donnees Hetzner)
- `monerometrics/` : Application principale (monerod, worker, PostgreSQL, API, backups)
- `monitoring/` : Stack kube-prometheus (values Helm), dashboard Grafana, acces NodePort
- `openbao/` : Gestionnaire de secrets (values Helm) — injection par sidecar dans les pods

## Deploiement

```bash
# 1. Configurer local-path-provisioner pour utiliser le data disk
kubectl apply -f k8s/storage/

# 2. Restart provisioner pour prendre en compte la nouvelle config
kubectl -n kube-system rollout restart deployment local-path-provisioner

# 3. Deployer l application
kubectl apply -k k8s/monerometrics/
```

Le monitoring et OpenBao sont installes via Helm avec leurs fichiers de values :

```bash
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace -f k8s/monitoring/values-kube-prometheus-stack.yaml
helm install openbao openbao/openbao \
  -n openbao --create-namespace -f k8s/openbao/values-openbao.yaml
```

## Gestion des secrets

Aucun secret n'est stocke dans les manifests. Les identifiants (PostgreSQL,
Restic/OCI) sont injectes au runtime par le **sidecar OpenBao (Bao Agent)** dans
`/vault/secrets/*` via l'auth Kubernetes (ServiceAccount), et lus depuis ces
fichiers par les pods. Le mot de passe PostgreSQL est genere au deploiement et
ne vit que dans OpenBao. Voir `monerometrics/BACKUP-PRA.md` pour le seeding.

## Reproductibilite

`kubectl apply -k k8s/monerometrics/` est idempotent : aucun effet si tout
est deja deploye, met a jour les ressources modifiees, cree les ressources
manquantes.

Le volume de donnees Hetzner (128 Go) est gere par Terraform et persiste
entre les destroy/apply du cluster. Donc la blockchain Monero syncee n est
pas perdue meme si on detruit tout sauf le disk.
