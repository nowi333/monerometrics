# outputs.tf — Module server (Hetzner Cloud)

output "id" {
  description = "ID du serveur Hetzner."
  value       = hcloud_server.this.id
}

output "name" {
  description = "Nom du serveur."
  value       = hcloud_server.this.name
}

output "public_ipv4" {
  description = "IPv4 publique du serveur (vide si desactivee)."
  value       = hcloud_server.this.ipv4_address
}

output "private_ip" {
  description = "IP privee du serveur dans le reseau prive."
  value       = hcloud_server_network.this.ip
}

output "data_volume_id" {
  description = "ID du volume de donnees (null si absent)."
  value       = try(hcloud_volume.data[0].id, null)
}

output "data_volume_device" {
  description = "Chemin Linux du volume de donnees (ex: /dev/disk/by-id/scsi-0HC_Volume_xxx), null si absent. Utilise par Ansible pour le montage."
  value       = try(hcloud_volume.data[0].linux_device, null)
}
