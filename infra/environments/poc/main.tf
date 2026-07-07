# main.tf — Environnement POC (Hetzner Cloud)
# Topologie : 3 serveurs (bastion, edge, k3s) sur un reseau prive, derriere
# des firewalls Hetzner, DNS/TLS via Cloudflare. Voir README pour le schema.

locals {
  project     = "monerometrics"
  environment = "poc"

  labels = {
    project     = "monerometrics"
    environment = "poc"
    managed_by  = "terraform"
    owner       = "noe"
  }

  # Plan d'adressage prive (sous-reseau 10.0.0.0/24)
  bastion_private_ip = "10.0.0.10"
  edge_private_ip    = "10.0.0.20"
  k3s_private_ip     = "10.0.0.30"
}

# ============================================================
# Cle SSH d'administration (injectee au boot des serveurs)
# ============================================================
resource "hcloud_ssh_key" "admin" {
  name       = "${local.project}-${local.environment}-admin"
  public_key = var.bastion_ssh_public_key
}

# ============================================================
# Reseau prive + firewalls
# ============================================================
module "network" {
  source = "../../modules/network"

  project         = local.project
  environment     = local.environment
  network_zone    = var.network_zone
  network_cidr    = "10.0.0.0/16"
  subnet_cidr     = "10.0.0.0/24"
  admin_source_ip = var.admin_source_ip
  labels          = local.labels
}

# ============================================================
# Bastion : unique point d'entree SSH (ProxyJump vers les autres)
# ============================================================
module "bastion" {
  source = "../../modules/server"

  project              = local.project
  environment          = local.environment
  role                 = "bastion"
  location             = var.location
  server_type          = var.bastion_server_type
  ssh_keys             = [hcloud_ssh_key.admin.name]
  admin_ssh_public_key = var.bastion_ssh_public_key
  network_id           = module.network.network_id
  private_ip           = local.bastion_private_ip
  labels               = local.labels
}

# ============================================================
# Edge : seule facade web publique (80/443), nginx + WAF + dashboard statique
# ============================================================
module "edge" {
  source = "../../modules/server"

  project              = local.project
  environment          = local.environment
  role                 = "edge"
  location             = var.location
  server_type          = var.edge_server_type
  ssh_keys             = [hcloud_ssh_key.admin.name]
  admin_ssh_public_key = var.bastion_ssh_public_key
  network_id           = module.network.network_id
  private_ip           = local.edge_private_ip
  labels               = local.labels
}

# ============================================================
# k3s : coeur applicatif (monerod, worker, PostgreSQL, API, OpenBao).
# Pas d'entree publique (firewall k3s) ; volume de donnees dedie.
# ============================================================
module "k3s" {
  source = "../../modules/server"

  project              = local.project
  environment          = local.environment
  role                 = "k3s"
  location             = var.location
  server_type          = var.k3s_server_type
  ssh_keys             = [hcloud_ssh_key.admin.name]
  admin_ssh_public_key = var.bastion_ssh_public_key
  network_id           = module.network.network_id
  private_ip           = local.k3s_private_ip
  data_volume_size     = var.k3s_data_volume_size
  labels               = local.labels
}

# ============================================================
# DNS Cloudflare : apex + www + api -> IP publique de l'edge (proxy actif)
# ============================================================
module "dns" {
  source = "../../modules/dns"

  zone_name = "monerometrics.net"
  a_records = {
    "@"   = module.edge.public_ipv4
    "www" = module.edge.public_ipv4
    "api" = module.edge.public_ipv4
  }
  proxied = true
}
