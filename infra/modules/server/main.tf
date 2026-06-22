# main.tf — Module server (Hetzner Cloud)
#
# Un serveur Hetzner generique, attache au reseau prive avec une IP fixe, avec
# un volume de donnees optionnel. Instancie une fois par role (bastion, edge,
# k3s) depuis l'environnement. Le label `role` declenche l'application du
# firewall correspondant (defini dans le module network).

locals {
  name = "${var.project}-${var.environment}-${var.role}"
  labels = merge(var.labels, {
    role       = var.role
    component  = var.role
    managed_by = "terraform"
  })
}

resource "hcloud_server" "this" {
  name        = local.name
  server_type = var.server_type
  image       = var.image
  location    = var.location
  ssh_keys    = var.ssh_keys
  labels      = local.labels

  public_net {
    ipv4_enabled = var.public_ipv4_enabled
    ipv6_enabled = var.public_ipv6_enabled
  }

  # Le serveur ne doit pas etre recree si la liste des cles SSH evolue
  # (les cles sont gerees ensuite par Ansible).
  lifecycle {
    ignore_changes = [ssh_keys]
  }
}

# Rattachement au reseau prive avec une IP fixe.
resource "hcloud_server_network" "this" {
  server_id  = hcloud_server.this.id
  network_id = var.network_id
  ip         = var.private_ip
}

# Volume de donnees optionnel (k3s : blockchain monerod + PostgreSQL).
# Monte par Ansible (role data_disk), pas par Hetzner (automount = false).
resource "hcloud_volume" "data" {
  count    = var.data_volume_size > 0 ? 1 : 0
  name     = "${local.name}-data"
  size     = var.data_volume_size
  location = var.location
  format   = "ext4"
  labels   = local.labels
}

resource "hcloud_volume_attachment" "data" {
  count     = var.data_volume_size > 0 ? 1 : 0
  volume_id = hcloud_volume.data[0].id
  server_id = hcloud_server.this.id
  automount = false
}
