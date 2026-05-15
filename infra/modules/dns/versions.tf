# versions.tf
# Module DNS : provisionne des records DNS chez Cloudflare.
# Provider cloudflare v5+ (incompatible v4, ne pas downgrader).

terraform {
  required_version = ">= 1.15.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}
