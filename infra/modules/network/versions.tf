# versions.tf
# Versions requises pour le module network.
# Les modules Terraform doivent declarer leur own required_providers,
# meme s ils ne configurent pas le provider (c est le rôle de l appelant).

terraform {
  required_version = ">= 1.15.0"

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.49"
    }
  }
}
