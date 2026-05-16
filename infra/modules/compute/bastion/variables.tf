# variables.tf
# Interface d entree du module bastion.

# ============================================================
# Identite et localisation
# ============================================================

variable "project" {
  description = "Nom du projet, sert de prefixe a toutes les ressources."
  type        = string
}

variable "environment" {
  description = "Environnement (poc, staging, prod)."
  type        = string
}

variable "location" {
  description = "Region Azure ou deployer la VM."
  type        = string
  default     = "swedencentral"
}

variable "tags" {
  description = "Tags appliques aux ressources du bastion."
  type        = map(string)
  default     = {}
}

# ============================================================
# Reseau
# ============================================================

variable "subnet_id" {
  description = "ID du subnet Mgmt ou la NIC du bastion sera attachee."
  type        = string
}

# ============================================================
# Configuration VM
# ============================================================

variable "vm_size" {
  description = "Taille Azure de la VM. B1s = 1 vCPU, 1 Go RAM, ~8 USD/mois."
  type        = string
  default     = "Standard_B2s_v2"
}

variable "admin_username" {
  description = "Nom d utilisateur admin Linux pour le SSH initial."
  type        = string
  default     = "noe"
}

variable "ssh_public_key" {
  description = "Cle publique SSH (format OpenSSH) autorisee a se connecter en tant qu admin."
  type        = string
}

variable "os_disk_size_gb" {
  description = "Taille du disque OS en Go."
  type        = number
  default     = 30
}

variable "os_disk_storage_type" {
  description = "Type de stockage du disque OS. Premium_LRS recommande pour reactivite SSH."
  type        = string
  default     = "Premium_LRS"
}

# ============================================================
# Ubuntu LTS - image officielle Canonical
# ============================================================

variable "ubuntu_version" {
  description = "Version Ubuntu LTS a deployer (24.04 = Noble Numbat)."
  type        = string
  default     = "server"
}
