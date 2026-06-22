# outputs.tf — Module network (Hetzner Cloud)

output "network_id" {
  description = "ID du reseau prive. Reference le sous-reseau pour garantir qu'il existe avant l'attachement des serveurs."
  value       = hcloud_network_subnet.main.network_id
}

output "network_name" {
  description = "Nom du reseau prive."
  value       = hcloud_network.main.name
}

output "network_cidr" {
  description = "CIDR du reseau prive."
  value       = hcloud_network.main.ip_range
}

output "subnet_cidr" {
  description = "CIDR du sous-reseau cloud."
  value       = hcloud_network_subnet.main.ip_range
}

output "firewall_ids" {
  description = "Map des IDs de firewall par role."
  value = {
    bastion = hcloud_firewall.bastion.id
    edge    = hcloud_firewall.edge.id
    k3s     = hcloud_firewall.k3s.id
  }
}
