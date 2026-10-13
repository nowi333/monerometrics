

output "network_name" {
  description = "Nom du reseau prive Hetzner."
  value       = module.network.network_name
}

output "subnet_cidr" {
  description = "CIDR du sous-reseau prive."
  value       = module.network.subnet_cidr
}

output "cloudflare_zone_id" {
  description = "ID Cloudflare de la zone monerometrics.net."
  value       = module.dns.zone_id
}

output "edge_public_ip" {
  description = "IP publique de l'edge nginx (cible des records DNS)."
  value       = module.edge.public_ipv4
}

output "edge_private_ip" {
  description = "IP privee de l'edge."
  value       = module.edge.private_ip
}

output "edge_ssh_command" {
  description = "Commande SSH vers l'edge, via Tailscale (aucun SSH public)."
  value       = "ssh ${var.admin_username}@monerometrics-edge"
}

output "k3s_private_ip" {
  description = "IP privee du noeud k3s (cible proxy_pass de l'edge)."
  value       = module.k3s.private_ip
}

output "k3s_ssh_command" {
  description = "Commande SSH vers k3s, via Tailscale (aucun SSH public)."
  value       = "ssh ${var.admin_username}@monerometrics-k3s"
}

output "k3s_data_volume_device" {
  description = "Chemin Linux du volume de donnees k3s (monte par Ansible)."
  value       = module.k3s.data_volume_device
}
