# outputs.tf
# Re-expose les outputs du module network pour visualisation post-apply
# (terraform output) et pour reutilisation par les modules suivants.

output "resource_group_name" {
  description = "Nom du Resource Group reseau."
  value       = module.network.resource_group_name
}

output "vnet_name" {
  description = "Nom du VNet."
  value       = module.network.vnet_name
}

output "vnet_id" {
  description = "ID du VNet."
  value       = module.network.vnet_id
}

output "subnet_ids" {
  description = "Map des IDs de subnets."
  value       = module.network.subnet_ids
}

output "subnet_cidrs" {
  description = "Map des CIDR des subnets."
  value       = module.network.subnet_cidrs
}
