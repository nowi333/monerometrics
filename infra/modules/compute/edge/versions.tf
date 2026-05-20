# versions.tf
# Module compute/edge : provisionne une VM Ubuntu hebergeant nginx en reverse
# proxy public dans le subnet DMZ. Exposition HTTPS 443 + HTTP 80 (redirect).

terraform {
  required_version = ">= 1.15.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.20"
    }
  }
}
