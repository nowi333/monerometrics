#!/usr/bin/env bash
# scripts/load-env.sh
#
# Charge dans l'environnement les jetons attendus par Terraform et Ansible,
# depuis le Keychain macOS (rien n'est stocke en clair dans le depot).
#
# Utilisation :
#   source scripts/load-env.sh
#
# Ne PAS executer avec ./scripts/load-env.sh : les exports seraient perdus.

# Verifie qu'on est bien source, pas execute
(return 0 2>/dev/null) || {
  echo "ERREUR : ce script doit etre source, pas execute."
  echo "Utilise : source scripts/load-env.sh"
  exit 1
}

_kc() { security find-generic-password -a "monerometrics" -s "$1" -w 2>/dev/null; }

# ============================================================
# Hetzner Cloud - jeton API (provider hcloud)
# ============================================================
export HCLOUD_TOKEN=$(_kc "hcloud-token")
if [[ -z "${HCLOUD_TOKEN:-}" ]]; then
  echo "ATTENTION : HCLOUD_TOKEN vide. Le provider hcloud ne fonctionnera pas."
fi

# ============================================================
# Cloudflare - jeton API (DNS + provider cloudflare + certbot DNS-01)
# ============================================================
export CLOUDFLARE_API_TOKEN=$(_kc "cloudflare-api-token")
if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "ATTENTION : CLOUDFLARE_API_TOKEN vide. Le provider cloudflare et certbot ne fonctionneront pas."
fi

# ============================================================
# Tailscale - auth key reutilisable (join tailnet via Ansible)
# ============================================================
export TAILSCALE_AUTH_KEY=$(_kc "tailscale-auth-key")
if [[ -z "${TAILSCALE_AUTH_KEY:-}" ]]; then
  echo "ATTENTION : TAILSCALE_AUTH_KEY vide. Le role Ansible tailscale ne pourra pas s'authentifier."
fi

# ============================================================
# GitHub Container Registry - PAT pour push/pull des images
# Token hors du depot : ~/.config/monerometrics/ghcr-token (chmod 600)
# ============================================================
export GHCR_USER="nowi333"
if [[ -f "$HOME/.config/monerometrics/ghcr-token" ]]; then
  export GHCR_TOKEN=$(cat "$HOME/.config/monerometrics/ghcr-token")
else
  export GHCR_TOKEN=""
  echo "ATTENTION : ~/.config/monerometrics/ghcr-token absent, push GHCR indisponible."
fi

echo "OK Credentials charges :"
echo "  Hetzner token      : ${HCLOUD_TOKEN:0:6}..."
echo "  Cloudflare token   : ${CLOUDFLARE_API_TOKEN:0:6}..."
echo "  Tailscale auth key : ${TAILSCALE_AUTH_KEY:0:11}..."
echo "  GHCR user / token  : ${GHCR_USER} / ${GHCR_TOKEN:0:6}..."
