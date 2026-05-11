# versions.tf
# Configuration Terraform et backend distant pour l environment POC.

terraform {
  required_version = ">= 1.15.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.20"
    }
  }

  # Backend distant : stocke le state dans le Storage Account cree par le bootstrap.
  # Chiffrement au repos (Microsoft-managed keys), lock automatique via blob lease,
  # versioning et soft delete 7 jours actives au niveau du storage account.
  backend "azurerm" {
    resource_group_name  = "rg-monerometrics-tfstate"
    storage_account_name = "stmonerometricstfdezfto"
    container_name       = "tfstate"
    key                  = "environments/poc/terraform.tfstate"
  }
}

provider "azurerm" {
  features {}

  # On gere les Resource Providers manuellement (deja registered lors du bootstrap).
  resource_provider_registrations = "none"
}
