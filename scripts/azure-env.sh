#!/usr/bin/env bash
# scripts/azure-env.sh
#
# Charge les credentials du Service Principal Terraform depuis le Keychain macOS
# dans les variables d'environnement attendues par le provider azurerm.
#
# Utilisation :
#   source scripts/azure-env.sh
#
# Ne PAS exécuter avec ./scripts/azure-env.sh : les exports seraient perdus.

set -euo pipefail

# Vérifie qu'on est bien sourcé, pas exécuté
(return 0 2>/dev/null) || {
  echo "ERREUR : ce script doit etre source, pas execute."
  echo "Utilise : source scripts/azure-env.sh"
  exit 1
}

# Récupère les valeurs depuis le Keychain
export ARM_CLIENT_ID=$(security find-generic-password -a "monerops" -s "azure-sp-app-id" -w 2>/dev/null)
export ARM_CLIENT_SECRET=$(security find-generic-password -a "monerops" -s "azure-sp-password" -w 2>/dev/null)
export ARM_TENANT_ID=$(security find-generic-password -a "monerops" -s "azure-sp-tenant" -w 2>/dev/null)
export ARM_SUBSCRIPTION_ID=$(security find-generic-password -a "monerops" -s "azure-subscription-id" -w 2>/dev/null)

# Verifications
if [[ -z "${ARM_CLIENT_ID:-}" ]]; then
  echo "ERREUR : ARM_CLIENT_ID vide. Verifie que les secrets sont dans Keychain."
  return 1
fi

echo "OK Credentials Azure charges :"
echo "  Subscription : ${ARM_SUBSCRIPTION_ID:0:8}..."
echo "  Tenant       : ${ARM_TENANT_ID:0:8}..."
echo "  Client ID    : ${ARM_CLIENT_ID:0:8}..."
echo "  Client secret: [masque]"
