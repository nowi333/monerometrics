# main.tf — Module network (Hetzner Cloud)
#
# Cree :
#   - 1 reseau prive (hcloud_network) + 1 sous-reseau cloud
#   - 3 firewalls (bastion, edge, k3s) appliques par label de role
#
# Modele de securite Hetzner (different d'Azure) :
#   - Les firewalls hcloud filtrent l'interface PUBLIQUE des serveurs.
#   - Le trafic interne au reseau prive n'est pas filtre : c'est le perimetre
#     de confiance (equivalent d'un VLAN d'administration).
#   - La segmentation repose donc sur "qui a une IP publique joignable" :
#     bastion (SSH admin), edge (80/443), k3s (rien en entree).

locals {
  name_prefix = "${var.project}-${var.environment}"
  common_labels = merge(var.labels, {
    managed_by = "terraform"
    component  = "network"
  })
}

# ============================================================
# Reseau prive + sous-reseau
# ============================================================
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

# ============================================================
# Firewall bastion : SSH depuis l'IP de l'administrateur uniquement
# ============================================================
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

# ============================================================
# Firewall edge : 80/443 depuis Internet (origin pull Cloudflare)
# Pas de SSH public : l'admin atteint l'edge via le bastion (reseau prive).
# ============================================================
resource "hcloud_firewall" "edge" {
  name   = "${local.name_prefix}-fw-edge"
  labels = local.common_labels

  rule {
    direction   = "in"
    protocol    = "tcp"
    port        = "80"
    source_ips  = ["0.0.0.0/0", "::/0"]
    description = "HTTP (redirection 301 vers HTTPS)"
  }

  rule {
    direction   = "in"
    protocol    = "tcp"
    port        = "443"
    source_ips  = ["0.0.0.0/0", "::/0"]
    description = "HTTPS (origin pull Cloudflare)"
  }

  apply_to {
    label_selector = "role=edge"
  }
}

# ============================================================
# Firewall k3s : AUCUNE regle entrante = tout le trafic public est bloque.
# k3s n'expose rien publiquement. L'admin et l'edge le joignent via le reseau
# prive (non filtre). L'IP publique ne sert qu'au sortant : synchronisation
# du noeud monerod et pull des images depuis GHCR.
# ============================================================
resource "hcloud_firewall" "k3s" {
  name   = "${local.name_prefix}-fw-k3s"
  labels = local.common_labels

  apply_to {
    label_selector = "role=k3s"
  }
}
