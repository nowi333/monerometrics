# variables.tf
# Interface d entree du module edge (reverse proxy nginx public).

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
  description = "Tags appliques aux ressources de l edge."
  type        = map(string)
  default     = {}
}

# ============================================================
# Reseau
# ============================================================

variable "subnet_id" {
  description = "ID du subnet DMZ ou la NIC de l edge sera attachee."
  type        = string
}

# ============================================================
# Configuration VM
# ============================================================

variable "vm_size" {
  description = "Taille Azure de la VM. B2s_v2 = 2 vCPU, 8 Go RAM. Suffisant pour nginx + ModSecurity."
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
  description = "Taille du disque OS en Go. nginx logs peuvent croitre vite, 30 Go OK pour POC."
  type        = number
  default     = 30
}

variable "os_disk_storage_type" {
  description = "Type de stockage du disque OS. Premium_LRS recommande pour latence I/O constante."
  type        = string
  default     = "Premium_LRS"
}

# ============================================================
# Ubuntu LTS - image officielle Canonical
# ============================================================

variable "ubuntu_version" {
  description = "Version Ubuntu LTS a deployer (24.04 = Noble Numbat). SKU 'server' = gen2 x86_64."
  type        = string
  default     = "server"
}
