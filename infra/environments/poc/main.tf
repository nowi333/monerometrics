

locals {
  project     = "monerometrics"
  environment = "poc"

  labels = {
    project     = "monerometrics"
    environment = "poc"
    managed_by  = "terraform"
    owner       = "nowi333"
  }


  bastion_private_ip = "10.0.0.10"
  edge_private_ip    = "10.0.0.20"
  k3s_private_ip     = "10.0.0.30"
}

resource "hcloud_ssh_key" "admin" {
  name       = "${local.project}-${local.environment}-admin"
  public_key = var.bastion_ssh_public_key
}

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
