

locals {
  name_prefix = "${var.project}-${var.environment}"
  common_labels = merge(var.labels, {
    managed_by = "terraform"
    component  = "network"
  })





  cloudflare_ips = [
    "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22",
    "141.101.64.0/18", "108.162.192.0/18", "190.93.240.0/20", "188.114.96.0/20",
    "197.234.240.0/22", "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13",
    "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22",
    "2400:cb00::/32", "2606:4700::/32", "2803:f800::/32", "2405:b500::/32",
    "2405:8100::/32", "2a06:98c0::/29", "2c0f:f248::/32",
  ]



  edge_web_source_ips = var.edge_cloudflare_only ? local.cloudflare_ips : ["0.0.0.0/0", "::/0"]
}

resource "hcloud_network" "main" {
  name     = "${local.name_prefix}-net"
  ip_range = var.network_cidr
  labels   = local.common_labels
}

resource "hcloud_network_subnet" "main" {
  network_id   = hcloud_network.main.id
  type         = "cloud"
  network_zone = var.network_zone
  ip_range     = var.subnet_cidr
}

resource "hcloud_firewall" "bastion" {
  name   = "${local.name_prefix}-fw-bastion"
  labels = local.common_labels

  rule {
    direction   = "in"
    protocol    = "tcp"
    port        = "22"
    source_ips  = [var.admin_source_ip]
    description = "SSH depuis l'administrateur"
  }

  rule {
    direction   = "in"
    protocol    = "icmp"
    source_ips  = [var.admin_source_ip]
    description = "ping diagnostic depuis l'administrateur"
  }

  apply_to {
    label_selector = "role=bastion"
  }
}

resource "hcloud_firewall" "edge" {
  name   = "${local.name_prefix}-fw-edge"
  labels = local.common_labels

  rule {
    direction   = "in"
    protocol    = "tcp"
    port        = "80"
    source_ips  = local.edge_web_source_ips
    description = "HTTP (redirection 301 vers HTTPS) - Cloudflare uniquement"
  }

  rule {
    direction   = "in"
    protocol    = "tcp"
    port        = "443"
    source_ips  = local.edge_web_source_ips
    description = "HTTPS (origin pull Cloudflare) - Cloudflare uniquement"
  }

  apply_to {
    label_selector = "role=edge"
  }
}

resource "hcloud_firewall" "k3s" {
  name   = "${local.name_prefix}-fw-k3s"
  labels = local.common_labels

  apply_to {
    label_selector = "role=k3s"
  }
}
