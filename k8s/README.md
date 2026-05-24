# Manifests Kubernetes monerometrics

Manifests deploys sur le cluster k3s single-node POC.

## Structure

- `storage/` : Configuration du provisioner local-path (pointe sur le data disk Azure)
- `monerometrics/` : Application principale (monerod + Postgres + worker)

## Deploiement

```bash
# 1. Configurer local-path-provisioner pour utiliser le data disk
kubectl apply -f k8s/storage/

# 2. Restart provisioner pour prendre en compte la nouvelle config
kubectl -n kube-system rollout restart deployment local-path-provisioner

# 3. Deployer l application
kubectl apply -k k8s/monerometrics/
```

Ou via le script orchestrateur : `./scripts/deploy-k8s.sh`

## Note securite POC

Le secret `postgres-credentials` contient un password en clair dans le YAML.
**A iterer au Sprint 6 (OpenBao)** : injection via External Secrets Operator
ou Bao Agent sidecar.

## Reproductibilite

`kubectl apply -k k8s/monerometrics/` est idempotent : aucun effet si tout
est deja deploye, met a jour les ressources modifiees, cree les ressources
manquantes.

Le data disk Azure (128 Go Standard SSD) est gere par Terraform et persiste
entre les destroy/apply du cluster. Donc la blockchain Monero syncee n est
pas perdue meme si on detruit tout sauf le disk.
