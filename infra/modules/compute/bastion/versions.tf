# versions.tf
# Module compute/bastion : provisionne une VM Ubuntu durcie servant de point
# d entree SSH unique a l infrastructure (Tailscale-only en pratique).

terraform {
  required_version = ">= 1.15.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.20"
    }
  }
}
