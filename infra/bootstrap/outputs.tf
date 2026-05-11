# outputs.tf
# Valeurs exportees apres apply.
# Utilisees par les autres modules Terraform (environments/poc, environments/prod, etc.)
# pour configurer leur backend distant.

output "resource_group_name" {
  description = "Nom du Resource Group hebergeant le state Terraform."
  value       = azurerm_resource_group.tfstate.name
}

output "storage_account_name" {
  description = "Nom du Storage Account hebergeant le state. A utiliser dans backend.tf des autres modules."
  value       = azurerm_storage_account.tfstate.name
}

output "container_name" {
  description = "Nom du container blob hebergeant les .tfstate."
  value       = azurerm_storage_container.tfstate.name
}

output "backend_config_snippet" {
  description = "Snippet a copier dans le backend.tf des autres modules."
  value       = <<EOT
terraform {
  backend "azurerm" {
    resource_group_name  = "${azurerm_resource_group.tfstate.name}"
    storage_account_name = "${azurerm_storage_account.tfstate.name}"
    container_name       = "${azurerm_storage_container.tfstate.name}"
    key                  = "MODULE_NAME.tfstate"
  }
}
EOT
}
