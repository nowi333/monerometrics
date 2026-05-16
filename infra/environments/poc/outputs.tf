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

# ============================================================
# DNS Cloudflare
# ============================================================
output "cloudflare_zone_id" {
  description = "ID Cloudflare de la zone monerometrics.net."
  value       = module.dns.zone_id
}

output "cloudflare_zone_name" {
  description = "Nom de la zone Cloudflare."
  value       = module.dns.zone_name
}

# ============================================================
# Bastion
# ============================================================
output "bastion_public_ip" {
  description = "IP publique du bastion (bootstrap initial uniquement)."
  value       = module.bastion.public_ip_address
}

output "bastion_private_ip" {
  description = "IP privee du bastion dans le subnet Mgmt."
  value       = module.bastion.private_ip_address
}

output "bastion_ssh_command" {
  description = "Commande SSH initiale (IP publique)."
  value       = module.bastion.ssh_command_initial
}
