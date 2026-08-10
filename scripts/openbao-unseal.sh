#!/usr/bin/env bash
set -euo pipefail

HOST="${OPENBAO_SSH_HOST:-monero-k3s}"
ACCOUNT="${OPENBAO_KEYCHAIN_ACCOUNT:-monerometrics}"

KEY="$(security find-generic-password -a "$ACCOUNT" -s openbao-unseal-key -w 2>/dev/null)" || {
  echo "no unseal key in keychain (run openbao-reinit.sh first)" >&2
  exit 1
}

printf '%s' "$KEY" | ssh "$HOST" "sudo kubectl exec -i -n openbao openbao-0 -- bao operator unseal -" >/dev/null
unset KEY

ssh "$HOST" "sudo kubectl exec -n openbao openbao-0 -- bao status" | grep -i sealed
