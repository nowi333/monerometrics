# versions.tf — Module server (Hetzner Cloud)

terraform {
  required_version = ">= 1.15.0"

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.49"
    }
  }
}
