#!/usr/bin/env bash
set -euo pipefail

HOST="${OPENBAO_SSH_HOST:-monero-k3s}"
ACCOUNT="${OPENBAO_KEYCHAIN_ACCOUNT:-monerometrics}"

command -v security >/dev/null || { echo "macOS 'security' (Keychain) required" >&2; exit 1; }

echo "==> scaling openbao down"
ssh "$HOST" "sudo kubectl scale statefulset openbao -n openbao --replicas=0"
ssh "$HOST" "until ! sudo kubectl get pod openbao-0 -n openbao >/dev/null 2>&1; do sleep 2; done"

echo "==> wiping raft pvc (old data is already unrecoverable)"
ssh "$HOST" "sudo kubectl delete pvc data-openbao-0 -n openbao --wait=true"

echo "==> scaling openbao up (fresh)"
ssh "$HOST" "sudo kubectl scale statefulset openbao -n openbao --replicas=1"
ssh "$HOST" "until [ \"\$(sudo kubectl get pod openbao-0 -n openbao -o jsonpath='{.status.containerStatuses[0].ready}' 2>/dev/null)\" = true ]; do sleep 2; done"

echo "==> initializing (1 key share, threshold 1)"
INIT="$(ssh "$HOST" "sudo kubectl exec -n openbao openbao-0 -- bao operator init -key-shares=1 -key-threshold=1 -format=json")"
UNSEAL="$(printf '%s' "$INIT" | python3 -c 'import sys,json;print(json.load(sys.stdin)["unseal_keys_b64"][0])')"
ROOT="$(printf '%s' "$INIT" | python3 -c 'import sys,json;print(json.load(sys.stdin)["root_token"])')"

echo "==> storing unseal key + root token in macOS Keychain"
security add-generic-password -U -a "$ACCOUNT" -s openbao-unseal-key -w "$UNSEAL"
security add-generic-password -U -a "$ACCOUNT" -s openbao-root-token -w "$ROOT"

echo "==> unsealing"
printf '%s' "$UNSEAL" | ssh "$HOST" "sudo kubectl exec -i -n openbao openbao-0 -- bao operator unseal -" >/dev/null
unset INIT UNSEAL ROOT

ssh "$HOST" "sudo kubectl exec -n openbao openbao-0 -- bao status" | grep -iE 'initialized|sealed'
echo "==> done. re-unseal anytime with scripts/openbao-unseal.sh"
