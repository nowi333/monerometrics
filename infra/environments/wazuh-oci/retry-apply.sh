#!/usr/bin/env bash

set -uo pipefail

cd "$(dirname "$0")"
LOG="$(pwd)/retry.log"

for var in TF_VAR_ssh_public_key TF_VAR_tailscale_auth_key ARM_CLIENT_ID ARM_SUBSCRIPTION_ID; do
  if [ -z "${!var:-}" ]; then
    echo "ERREUR : $var non defini. Charger les credentials avant nohup." | tee -a "$LOG"
    exit 1
  fi
done

ADS=("oNGr:EU-FRANKFURT-1-AD-1" "oNGr:EU-FRANKFURT-1-AD-2" "oNGr:EU-FRANKFURT-1-AD-3")
OCPUS=2
MEM=12
INTERVAL=90
i=0
attempt=0

echo "=== Demarrage boucle retry $(date "+%Y-%m-%d %H:%M:%S") ===" | tee -a "$LOG"
echo "Cible : ${OCPUS} OCPU / ${MEM} Go, rotation 3 AD, interval ${INTERVAL}s" | tee -a "$LOG"

while true; do
  attempt=$((attempt + 1))
  ad="${ADS[$((i % 3))]}"
  i=$((i + 1))
  ts="$(date "+%H:%M:%S")"

  echo "[$ts] Tentative

  output=$(terraform apply -auto-approve     -var "availability_domain=${ad}"     -var "instance_ocpus=${OCPUS}"     -var "instance_memory_gb=${MEM}" 2>&1)

  if echo "$output" | grep -q "Apply complete"; then
    echo "[$ts] *** SUCCES sur ${ad} apres ${attempt} tentatives ***" | tee -a "$LOG"
    echo "$output" | grep -E "public_ip|Apply complete" | tee -a "$LOG"
    echo "" | tee -a "$LOG"
    terraform output | tee -a "$LOG"
    osascript -e "display notification \"Instance Wazuh creee sur ${ad}\" with title \"OCI capacity OK\" sound name \"Glass\"" 2>/dev/null
    afplay /System/Library/Sounds/Glass.aiff 2>/dev/null
    break
  elif echo "$output" | grep -q "Out of host capacity"; then
    echo "[$ts]   -> out of capacity, retry dans ${INTERVAL}s" | tee -a "$LOG"
  else
    echo "[$ts]   -> ERREUR INATTENDUE, arret de la boucle :" | tee -a "$LOG"
    echo "$output" | tail -15 | tee -a "$LOG"
    break
  fi

  sleep "$INTERVAL"
done

echo "=== Fin boucle $(date "+%Y-%m-%d %H:%M:%S") ===" | tee -a "$LOG"
