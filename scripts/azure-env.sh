#!/usr/bin/env bash
# scripts/azure-env.sh
#
# Charge les credentials du Service Principal Terraform Azure depuis Keychain macOS
# dans les variables d environnement attendues par le provider azurerm.
# Charge aussi le token API Cloudflare pour le provider cloudflare.
#
# Utilisation :
#   source scripts/azure-env.sh
#
# Ne PAS executer avec ./scripts/azure-env.sh : les exports seraient perdus.

set -euo pipefail

# Verifie qu on est bien source, pas execute
(return 0 2>/dev/null) || {
  echo "ERREUR : ce script doit etre source, pas execute."
  echo "Utilise : source scripts/azure-env.sh"
  exit 1
}

# ============================================================
# Azure - Service Principal Terraform
# ============================================================
export ARM_CLIENT_ID=$(security find-generic-password -a "monerops" -s "azure-sp-app-id" -w 2>/dev/null)
export ARM_CLIENT_SECRET=$(security find-generic-password -a "monerops" -s "azure-sp-password" -w 2>/dev/null)
export ARM_TENANT_ID=$(security find-generic-password -a "monerops" -s "azure-sp-tenant" -w 2>/dev/null)
export ARM_SUBSCRIPTION_ID=$(security find-generic-password -a "monerops" -s "azure-subscription-id" -w 2>/dev/null)

if [[ -z "${ARM_CLIENT_ID:-}" ]]; then
  echo "ERREUR : ARM_CLIENT_ID vide. Verifie que les secrets Azure sont dans Keychain."
  return 1
fi

# ============================================================
# Cloudflare - API Token (scope monerometrics.net DNS)
# ============================================================
export CLOUDFLARE_API_TOKEN=$(security find-generic-password -a "monerometrics" -s "cloudflare-api-token" -w 2>/dev/null)

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "ATTENTION : CLOUDFLARE_API_TOKEN vide. Le provider cloudflare ne fonctionnera pas."
fi

# ============================================================
# ============================================================
# Tailscale - Auth key reutilisable pour join tailnet
# ============================================================
export TAILSCALE_AUTH_KEY=$(security find-generic-password -a "monerometrics" -s "tailscale-auth-key" -w 2>/dev/null)

if [[ -z "${TAILSCALE_AUTH_KEY:-}" ]]; then
  echo "ATTENTION : TAILSCALE_AUTH_KEY vide. Ansible role tailscale ne pourra pas auth."
fi


# Recap
# ============================================================

# ============================================================
# GitHub Container Registry - PAT pour push/pull images
# Token stocke dans ~/.config/monerometrics/ghcr-token (chmod 600)
# Hors du repo git pour eviter toute fuite.
# ============================================================
export GHCR_USER="nowi333"
if [[ -f "$HOME/.config/monerometrics/ghcr-token" ]]; then
  export GHCR_TOKEN=$(cat "$HOME/.config/monerometrics/ghcr-token")
else
  export GHCR_TOKEN=""
  echo "WARNING : ~/.config/monerometrics/ghcr-token absent, push GHCR indisponible"
fi

echo "OK Credentials charges :"
echo "  Azure subscription : ${ARM_SUBSCRIPTION_ID:0:8}..."
echo "  Azure tenant       : ${ARM_TENANT_ID:0:8}..."
echo "  Azure client ID    : ${ARM_CLIENT_ID:0:8}..."
echo "  Azure secret       : [masque]"
echo "  Cloudflare token   : ${CLOUDFLARE_API_TOKEN:0:8}..."
echo "  Tailscale auth key : ${TAILSCALE_AUTH_KEY:0:11}..."
echo "  GHCR token         : ${GHCR_TOKEN:0:8}..."
