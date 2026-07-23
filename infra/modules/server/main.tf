

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


  user_data = templatefile("${path.module}/cloud-init.yaml.tftpl", {
    admin_username       = var.admin_username
    admin_ssh_public_key = var.admin_ssh_public_key
  })

  public_net {
    ipv4_enabled = var.public_ipv4_enabled
    ipv6_enabled = var.public_ipv6_enabled
  }



  lifecycle {
    ignore_changes = [ssh_keys]
  }
}

resource "hcloud_server_network" "this" {
  server_id  = hcloud_server.this.id
  network_id = var.network_id
  ip         = var.private_ip
}

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
