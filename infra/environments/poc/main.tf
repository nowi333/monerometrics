# main.tf
# Environment POC : instancie le module network avec les valeurs POC.

module "network" {
  source = "../../modules/network"

  project     = "monerometrics"
  environment = "poc"
  location    = "francecentral"

  # Plan d adressage POC : meme structure que prod, plage 10.0.0.0/16
  vnet_cidr = "10.0.0.0/16"
  subnets = {
    dmz        = "10.0.1.0/24"
    app        = "10.0.10.0/24"
    data       = "10.0.20.0/24"
    mgmt       = "10.0.30.0/24"
    monitoring = "10.0.40.0/24"
    reserved   = "10.0.50.0/24"
  }

  # IP admin autorisee sur le bastion : passee depuis terraform.tfvars (gitignored).
  admin_source_ip = var.admin_source_ip

  # Forced tunneling desactive tant qu OPNsense n est pas deploye.
  # Sinon les VM ne peuvent pas joindre Azure pour leur cloud-init.
  # On l activera dans le Sprint 3 apres deploiement OPNsense.
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
