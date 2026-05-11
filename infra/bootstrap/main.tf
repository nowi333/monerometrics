# main.tf
# Bootstrap du backend Terraform distant.
#
# Cree :
#   - 1 Resource Group dedie au state Terraform
#   - 1 Storage Account chiffre, versionne, securise
#   - 1 Blob Container pour les fichiers tfstate
#
# Lance UNE SEULE FOIS au demarrage du projet.
# Apres cela, tous les autres modules referenceront ce backend distant.

# Genere un suffixe aleatoire pour garantir l unicite du nom du Storage Account
# (les noms de Storage Account sont globalement uniques sur tout Azure).
# Persistant : ce suffixe est fixe une fois pour toutes via le state local.
resource "random_string" "storage_suffix" {
  length  = 6
  special = false
  upper   = false
  numeric = true
}

# Resource Group dedie au state Terraform.
# Isole de toutes les autres ressources du projet.
resource "azurerm_resource_group" "tfstate" {
  name     = "rg-${var.project}-tfstate"
  location = var.location
  tags     = var.tags
}

# Storage Account hebergeant le state.
# Nommage : st<project>tf<suffix> sans tiret (contrainte Azure : 3-24 chars, alphanum lowercase).
resource "azurerm_storage_account" "tfstate" {
  name                = "st${var.project}tf${random_string.storage_suffix.result}"
  resource_group_name = azurerm_resource_group.tfstate.name
  location            = azurerm_resource_group.tfstate.location

  # Standard LRS = Locally Redundant Storage : 3 copies dans le meme datacenter.
  # Suffisant pour un state Terraform. Cout : 0.018 USD/Go/mois.
  account_tier             = "Standard"
  account_replication_type = "LRS"
  account_kind             = "StorageV2"

  # Securite : refuse les acces anonymes meme via container public.
  allow_nested_items_to_be_public = false

  # Securite : impose HTTPS pour toutes les requetes.
  https_traffic_only_enabled = true

  # Securite : TLS 1.2 minimum (TLS 1.0 et 1.1 sont deprecies).
  min_tls_version = "TLS1_2"

  # Chiffrement au repos : Microsoft-managed keys (gratuit, automatique, AES-256).
  # Pour aller plus loin en prod : Customer-managed keys via Key Vault.
  infrastructure_encryption_enabled = true

  # Bloque l acces public au compte sauf via les firewalls explicites.
  # Pour cette phase POC on laisse "Enabled" car on n a pas encore configure le VNet.
  # On durcira plus tard avec un private endpoint.
  public_network_access_enabled = true

  # Versioning des blobs : permet de revenir en arriere si state corrompu.
  # Soft delete : 7 jours de retention pour les blobs supprimes par erreur.
  blob_properties {
    versioning_enabled       = true
    change_feed_enabled      = false
    last_access_time_enabled = false

    delete_retention_policy {
      days = 7
    }

    container_delete_retention_policy {
      days = 7
    }
  }

  tags = var.tags
}

# Container blob dans le Storage Account.
# Tous les fichiers .tfstate du projet iront dans ce container, avec une cle par module.
resource "azurerm_storage_container" "tfstate" {
  name                  = "tfstate"
  storage_account_id    = azurerm_storage_account.tfstate.id
  container_access_type = "private"
}
