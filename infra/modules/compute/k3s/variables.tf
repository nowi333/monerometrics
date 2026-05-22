# Variables d entree du module compute/k3s

variable "project" {
  description = "Nom du projet (prefix de toutes les ressources)."
  type        = string
}

variable "environment" {
  description = "Environnement (poc, staging, prod)."
  type        = string
}

variable "location" {
  description = "Region Azure ou deployer la VM k3s."
  type        = string
}

variable "subnet_id" {
  description = "ID du subnet app dans lequel placer la VM (pas d IP publique)."
  type        = string
}

variable "vm_size" {
  description = "Taille de la VM Azure."
  type        = string
  default     = "Standard_B2s_v2"
}

variable "admin_username" {
  description = "Username de l administrateur Linux."
  type        = string
  default     = "noe"
}

variable "ssh_public_key" {
  description = "Cle publique SSH (format OpenSSH) - meme cle que bastion pour ProxyJump."
  type        = string
}

variable "tags" {
  description = "Tags appliques a toutes les ressources k3s."
  type        = map(string)
  default     = {}
}
