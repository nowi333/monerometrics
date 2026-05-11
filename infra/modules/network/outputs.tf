# outputs.tf
# Valeurs exposees par le module aux appelants.
# Les modules compute / identity / observability vont reutiliser ces IDs
# pour deployer leurs VM dans les bons subnets.

output "resource_group_name" {
  description = "Nom du Resource Group reseau."
  value       = azurerm_resource_group.network.name
}

output "vnet_id" {
  description = "ID complet du VNet."
  value       = azurerm_virtual_network.main.id
}

output "vnet_name" {
  description = "Nom du VNet."
  value       = azurerm_virtual_network.main.name
}

output "subnet_ids" {
  description = "Map des IDs de subnets, indexee par nom logique (dmz, app, data, mgmt, monitoring, reserved)."
  value       = { for k, s in azurerm_subnet.this : k => s.id }
}

output "subnet_cidrs" {
  description = "Map des CIDR des subnets, indexee par nom logique."
  value       = var.subnets
}

output "nsg_ids" {
  description = "Map des IDs de NSG, indexee par nom logique."
  value       = { for k, n in azurerm_network_security_group.this : k => n.id }
}
