# versions.tf
# Verrouille les versions de Terraform et des providers.
# Reproductibilite garantie sur toutes les machines du projet.

terraform {
  # Version minimale de Terraform requise.
  required_version = ">= 1.15.0"

  # Provider azurerm : interface entre Terraform et Azure Resource Manager.
  # On verrouille sur la branche 4.x (compatible Terraform 1.15+).
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.20"
    }

    # Provider random : utilise pour generer un suffixe unique
    # pour le Storage Account (les noms sont globalement uniques sur Azure).
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

# Configuration du provider azurerm.
# Les credentials sont lus depuis les variables d environnement ARM_*
# chargees par scripts/azure-env.sh.
provider "azurerm" {
  # Active toutes les features par defaut.
  features {}
}
