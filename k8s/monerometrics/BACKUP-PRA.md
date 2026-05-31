# Plan de Reprise d'Activité (PRA) — Sauvegardes

Sauvegarde chiffrée et automatisée des données critiques de monerometrics
vers **Oracle Cloud Object Storage**, séparée de la production Azure.

## Principe : séparation des périmètres de défaillance

La production tourne sur **Azure** (k3s, PostgreSQL, monerod). Les sauvegardes
sont stockées chez un **fournisseur distinct (Oracle Cloud)**, conformément à
la règle 3-2-1. Un incident majeur sur Azure (compromission du compte,
suppression du resource group, blocage de l'abonnement) n'affecte pas la
capacité de restauration.

- **Outil** : Restic (chiffrement AES-256, déduplication, snapshots)
- **Backend** : OCI Object Storage via API S3-compatible
- **Endpoint** : `s3:https://<namespace>.compat.objectstorage.eu-frankfurt-1.oraclecloud.com/monerometrics-backups`
- **Région** : eu-frankfurt-1 (variable `AWS_DEFAULT_REGION` obligatoire pour la signature S3)

## Périmètre sauvegardé

| Donnée | Méthode | Fréquence |
|--------|---------|-----------|
| Base PostgreSQL (blocs, reorgs, pools) | `pg_dump` | Quotidien (CronJob) |
| Manifests k8s du namespace | `kubectl get -o yaml` | Quotidien (CronJob) |
| Snapshot Raft OpenBao (secrets chiffrés) | `bao operator raft snapshot` | Manuel (procédure ci-dessous) |

Le snapshot OpenBao est **manuel** : il change rarement et nécessite le root
token (hors périmètre automatisé pour limiter l'exposition du secret).

## Composants

- `70-backup-rbac.yaml` : ServiceAccount `backup-operator` + Role (moindre
  privilège : lecture seule du namespace + exec sur le pod postgres).
- `71-backup-cronjob.yaml` : CronJob quotidien (03:00 UTC). Image `debian:stable-slim`,
  installe restic + postgresql-client + kubectl au runtime.
- Secret `restic-backup-creds` : créé **hors manifest** (jamais versionné), voir ci-dessous.

## Création du Secret (à faire une fois, hors Git)

Les credentials ne sont jamais dans le dépôt. Création depuis le poste d'admin
(valeurs lues depuis le trousseau macOS) :

```sh
kubectl -n monerometrics create secret generic restic-backup-creds \
  --from-literal=RESTIC_REPOSITORY='s3:https://<ns>.compat.objectstorage.eu-frankfurt-1.oraclecloud.com/monerometrics-backups' \
  --from-literal=RESTIC_PASSWORD='<mot-de-passe-repo-restic>' \
  --from-literal=AWS_ACCESS_KEY_ID='<oci-customer-secret-key-id>' \
  --from-literal=AWS_SECRET_ACCESS_KEY='<oci-customer-secret-key>' \
  --from-literal=AWS_DEFAULT_REGION='eu-frankfurt-1'
```

## Secrets critiques de recouvrement

Trois secrets sont indispensables à toute restauration. Sans eux, les backups
sont irrécupérables. Ils sont stockés en **trois endroits** (défense en profondeur) :
trousseau macOS (usage), gestionnaire de mots de passe externe (recouvrement),
copie hors-ligne (catastrophe).

1. **Mot de passe du repo Restic** — déchiffre l'intégralité des sauvegardes.
2. **Clés de unseal OpenBao** (3 sur 5, seuil de Shamir) — déverrouillent le coffre.
3. **Customer Secret Key OCI** — accès en écriture/lecture au bucket.

## Procédure de restauration

### Pré-requis
Exporter les variables d'environnement (repo + creds S3 + région + password).

### Lister les sauvegardes disponibles
```sh
restic snapshots
```

### Restaurer la dernière sauvegarde
```sh
restic restore latest --target /tmp/restore
# Les fichiers sont restaurés sous /tmp/restore/...
```

### Réinjecter le dump PostgreSQL
```sh
kubectl -n monerometrics exec -i <pod-postgres> -- \
  sh -c 'PGPASSWORD=$POSTGRES_PASSWORD psql -U $POSTGRES_USER $POSTGRES_DB' < /tmp/restore/.../postgres-dump.sql
```

### Restaurer OpenBao (depuis le snapshot Raft)
```sh
# Avec un token valide :
bao operator raft snapshot restore /tmp/restore/.../openbao-raft.snap
```

## Snapshot OpenBao manuel (procédure)

```sh
ROOT_TOKEN=<root-token-depuis-coffre-de-recouvrement>
kubectl -n openbao exec openbao-0 -- sh -c \
  "export BAO_ADDR=http://127.0.0.1:8200; export BAO_TOKEN=$ROOT_TOKEN; \
   bao operator raft snapshot save /tmp/bao.snap && cat /tmp/bao.snap" > openbao-raft.snap
# Puis pousser ce fichier dans le repo Restic via restic backup.
```

## Politique de rétention

`restic forget --keep-daily 7 --keep-weekly 4 --prune` : conserve 7 sauvegardes
quotidiennes et 4 hebdomadaires, supprime et compacte le reste automatiquement.

## Tests de restauration

Le cycle backup → restore a été **testé et validé** : restauration dans un
répertoire temporaire, vérification de l'intégrité (tailles identiques, dump
SQL lisible). Un PRA non testé n'a aucune valeur ; ce test doit être rejoué
périodiquement.

## Architecture cible (production)

En POC, sauvegarde cross-cloud unique vers OCI. En production, double cible :
- Azure Blob (RTO court, restauration rapide intra-cloud)
- OCI Object Storage (résilience géographique et multi-fournisseur)

Avec une image de backup versionnée dédiée (au lieu de l'installation runtime)
poussée sur un registre privé.
