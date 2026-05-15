# versions.tf
# Configuration Terraform et backend distant pour l environment POC.

terraform {
  required_version = ">= 1.15.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.20"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  # Backend distant : stocke le state dans le Storage Account cree par le bootstrap.
  backend "azurerm" {
    resource_group_name  = "rg-monerometrics-tfstate"
    storage_account_name = "stmonerometricstfdezfto"
    container_name       = "tfstate"
    key                  = "environments/poc/terraform.tfstate"
  }
}

provider "azurerm" {
  features {}
  resource_provider_registrations = "none"
}

# Provider cloudflare : authentifie via la variable d env CLOUDFLARE_API_TOKEN
# chargee par scripts/azure-env.sh depuis Keychain macOS.
provider "cloudflare" {}
