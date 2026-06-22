# versions.tf — Environnement POC (Hetzner Cloud)

terraform {
  required_version = ">= 1.15.0"

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.49"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  # State local pour le POC. Le fichier terraform.tfstate est gitignore
  # (peut contenir des donnees sensibles).
  # Cible production : backend distant chiffre, par ex. S3-compatible vers
  # Oracle Cloud Object Storage (deja utilise pour les sauvegardes Restic).
}

# Provider hcloud : authentifie via la variable d'env HCLOUD_TOKEN
# (chargee par scripts/load-env.sh depuis le Keychain macOS).
provider "hcloud" {}

# Provider cloudflare : authentifie via CLOUDFLARE_API_TOKEN (meme mecanisme).
provider "cloudflare" {}
