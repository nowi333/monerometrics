# variables.tf
# Interface d entree du module network.
# Toutes ces variables sont passees par l environment qui appelle le module.

# ============================================================
# Identite du deploiement
# ============================================================

variable "project" {
  description = "Nom du projet (ex: monerometrics). Sert de prefixe a toutes les ressources reseau."
  type        = string
}

variable "environment" {
  description = "Environnement (poc, staging, prod). Permet d isoler plusieurs deploiements en parallele."
  type        = string
  validation {
    condition     = contains(["poc", "staging", "prod"], var.environment)
    error_message = "environment doit etre poc, staging ou prod."
  }
}

variable "location" {
  description = "Region Azure ou deployer le reseau."
  type        = string
  default     = "francecentral"
}

variable "tags" {
  description = "Tags appliques a toutes les ressources reseau."
  type        = map(string)
  default     = {}
}

# ============================================================
# Plan d adressage
# ============================================================

variable "vnet_cidr" {
  description = "CIDR du VNet principal. Doit englober tous les subnets."
  type        = string
  default     = "10.0.0.0/16"
}

# Map des subnets : nom -> CIDR.
# On utilise une map plutot que des variables individuelles
# pour pouvoir iterer dessus avec for_each (plus DRY, plus extensible).
variable "subnets" {
  description = "Subnets a creer dans le VNet. Cle = nom logique, valeur = CIDR."
  type        = map(string)
  default = {
    dmz        = "10.0.1.0/24"  # Pare-feu OPNsense, nginx WAF
    app        = "10.0.10.0/24" # Cluster k3s, charges applicatives
    data       = "10.0.20.0/24" # monerod, PostgreSQL Patroni, etcd
    mgmt       = "10.0.30.0/24" # Bastion, Authentik, OpenBao
    monitoring = "10.0.40.0/24" # Wazuh, Prometheus, Grafana, Loki
    reserved   = "10.0.50.0/24" # Reserve pour extension future
  }
}

# ============================================================
# Securite reseau
# ============================================================

variable "admin_source_ip" {
  description = "Adresse IP publique de l administrateur, autorisee a se connecter au bastion SSH. Format CIDR (ex: 92.184.X.X/32)."
  type        = string
  # Pas de valeur par defaut : doit etre fournie explicitement par l environment.
  # Securite : evite qu un oubli laisse le bastion ouvert au monde.
}

variable "enable_forced_tunneling" {
  description = "Si true, route tout le trafic sortant des subnets internes via OPNsense. Mis a false tant qu OPNsense n est pas deploye, sinon les VM ne peuvent pas joindre Azure pour leur installation initiale."
  type        = bool
  default     = false
}

variable "opnsense_internal_ip" {
  description = "IP interne d OPNsense, utilisee comme next-hop pour les route tables. Ignore si enable_forced_tunneling est false."
  type        = string
  default     = "10.0.1.10"
}
