# main.tf
# Environment POC : instancie les modules avec les valeurs POC.

# ============================================================
# Module Network : VNet + 6 subnets + 6 NSG
# ============================================================
module "network" {
  source = "../../modules/network"

  project     = "monerometrics"
  environment = "poc"
  location    = "swedencentral"

  vnet_cidr = "10.0.0.0/16"
  subnets = {
    dmz        = "10.0.1.0/24"
    app        = "10.0.10.0/24"
    data       = "10.0.20.0/24"
    mgmt       = "10.0.30.0/24"
    monitoring = "10.0.40.0/24"
    reserved   = "10.0.50.0/24"
  }

  admin_source_ip = var.admin_source_ip

  # Forced tunneling desactive : pas d OPNsense dans cette stack POC.
  # Stack edge cloud-native : NSG + nginx + ModSecurity + Suricata + CrowdSec.
  enable_forced_tunneling = false

  tags = {
    project     = "monerometrics"
    environment = "poc"
    managed_by  = "terraform"
    cost_center = "education"
    owner       = "noe"
  }
}

# ============================================================
# Module DNS : Cloudflare records pour monerometrics.net
# Pour l instant, aucun record A defini (pas encore de VM publique).
# On ajoutera les records au sous-sprint 3B quand on creera la VM nginx.
# ============================================================
module "dns" {
  source = "../../modules/dns"

  zone_name = "monerometrics.net"
  a_records = {}
  proxied   = false
}

# ============================================================
# Module Bastion : VM Ubuntu durcie dans le subnet Mgmt
# Point d entree SSH unique. Sera reconfigure pour Tailscale-only au Bloc 4.
# ============================================================
module "bastion" {
  source = "../../modules/compute/bastion"

  project     = "monerometrics"
  environment = "poc"
  location    = "swedencentral"

  subnet_id      = module.network.subnet_ids["mgmt"]
  ssh_public_key = var.bastion_ssh_public_key
  admin_username = "noe"

  vm_size              = "Standard_B2s_v2"
  os_disk_size_gb      = 30
  os_disk_storage_type = "Premium_LRS"

  tags = {
    project     = "monerometrics"
    environment = "poc"
    managed_by  = "terraform"
    cost_center = "education"
    owner       = "noe"
  }
}
