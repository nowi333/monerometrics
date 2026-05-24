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

# ============================================================
# Edge (nginx reverse proxy)
# ============================================================
output "edge_public_ip" {
  description = "IP publique de l edge nginx (cible DNS Cloudflare)."
  value       = module.edge.public_ip_address
}

output "edge_private_ip" {
  description = "IP privee de l edge dans le subnet DMZ."
  value       = module.edge.private_ip_address
}

output "edge_ssh_command" {
  description = "Commande SSH initiale (IP publique) pour bootstrap Ansible."
  value       = module.edge.ssh_command_initial
}

# ============================================================
# K3S (single-node, IP privee uniquement)
# ============================================================
output "k3s_private_ip" {
  description = "IP privee de la VM k3s dans le subnet app (target proxy_pass nginx)."
  value       = module.k3s.private_ip_address
}

output "k3s_resource_group_name" {
  description = "Nom du resource group k3s."
  value       = module.k3s.resource_group_name
}

output "k3s_ssh_command" {
  description = "Commande SSH avec ProxyJump via bastion."
  value       = "ssh -J noe@${module.bastion.public_ip_address} noe@${module.k3s.private_ip_address}"
}

output "k3s_data_disk_id" {
  description = "ID du data disk k3s (128 Go Standard SSD)."
  value       = module.k3s.data_disk_id
}

output "k3s_data_disk_lun" {
  description = "LUN du data disk k3s pour montage Linux."
  value       = module.k3s.data_disk_lun
}
