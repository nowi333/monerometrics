# outputs.tf — Environnement POC (Hetzner Cloud)

# ============================================================
# Reseau
# ============================================================
output "network_name" {
  description = "Nom du reseau prive Hetzner."
  value       = module.network.network_name
}

output "subnet_cidr" {
  description = "CIDR du sous-reseau prive."
  value       = module.network.subnet_cidr
}

# ============================================================
# DNS Cloudflare
# ============================================================
output "cloudflare_zone_id" {
  description = "ID Cloudflare de la zone monerometrics.net."
  value       = module.dns.zone_id
}

# ============================================================
# Bastion
# ============================================================
output "bastion_public_ip" {
  description = "IP publique du bastion (point d'entree SSH)."
  value       = module.bastion.public_ipv4
}

output "bastion_private_ip" {
  description = "IP privee du bastion."
  value       = module.bastion.private_ip
}

output "bastion_ssh_command" {
  description = "Commande SSH vers le bastion."
  value       = "ssh noe@${module.bastion.public_ipv4}"
}

# ============================================================
# Edge (cible DNS Cloudflare)
# ============================================================
output "edge_public_ip" {
  description = "IP publique de l'edge nginx (cible des records DNS)."
  value       = module.edge.public_ipv4
}

output "edge_private_ip" {
  description = "IP privee de l'edge."
  value       = module.edge.private_ip
}

output "edge_ssh_command" {
  description = "Commande SSH vers l'edge via ProxyJump bastion (reseau prive)."
  value       = "ssh -J noe@${module.bastion.public_ipv4} noe@${module.edge.private_ip}"
}

# ============================================================
# k3s (sans entree publique)
# ============================================================
output "k3s_private_ip" {
  description = "IP privee du noeud k3s (cible proxy_pass de l'edge)."
  value       = module.k3s.private_ip
}

output "k3s_ssh_command" {
  description = "Commande SSH vers k3s via ProxyJump bastion (reseau prive)."
  value       = "ssh -J noe@${module.bastion.public_ipv4} noe@${module.k3s.private_ip}"
}

output "k3s_data_volume_device" {
  description = "Chemin Linux du volume de donnees k3s (monte par Ansible)."
  value       = module.k3s.data_volume_device
}
