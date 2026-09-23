#!/usr/bin/env bash

(return 0 2>/dev/null) || {
  echo "ERREUR : ce script doit etre source, pas execute."
  echo "Utilise : source scripts/load-env.sh"
  exit 1
}

_kc() { security find-generic-password -a "monerometrics" -s "$1" -w 2>/dev/null; }

export HCLOUD_TOKEN=$(_kc "hcloud-token")
if [[ -z "${HCLOUD_TOKEN:-}" ]]; then
  echo "ATTENTION : HCLOUD_TOKEN vide. Le provider hcloud ne fonctionnera pas."
fi

export CLOUDFLARE_API_TOKEN=$(_kc "cloudflare-api-token")
if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "ATTENTION : CLOUDFLARE_API_TOKEN vide. Le provider cloudflare et certbot ne fonctionneront pas."
fi

export TAILSCALE_AUTH_KEY=$(_kc "tailscale-auth-key")
if [[ -z "${TAILSCALE_AUTH_KEY:-}" ]]; then
  echo "ATTENTION : TAILSCALE_AUTH_KEY vide. Le role Ansible tailscale ne pourra pas s'authentifier."
fi

export GHCR_USER="nowi333"
if [[ -f "$HOME/.config/monerometrics/ghcr-token" ]]; then
  export GHCR_TOKEN=$(cat "$HOME/.config/monerometrics/ghcr-token")
else
  export GHCR_TOKEN=""
  echo "ATTENTION : ~/.config/monerometrics/ghcr-token absent, push GHCR indisponible."
fi

# Seul l'etat est affiche : un debut de jeton n'a rien a faire dans un
# terminal, un partage d'ecran ou un historique.
_st() { [[ -n "${1:-}" ]] && echo "charge" || echo "MANQUANT"; }
echo "Credentials :"
echo "  Hetzner token      : $(_st "${HCLOUD_TOKEN:-}")"
echo "  Cloudflare token   : $(_st "${CLOUDFLARE_API_TOKEN:-}")"
echo "  Tailscale auth key : $(_st "${TAILSCALE_AUTH_KEY:-}")"
echo "  GHCR token         : $(_st "${GHCR_TOKEN:-}")"
