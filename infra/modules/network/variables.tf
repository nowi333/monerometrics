# variables.tf — Module network (Hetzner Cloud)

variable "project" {
  description = "Nom du projet (prefixe des ressources)."
  type        = string
}

variable "environment" {
  description = "Environnement (poc, staging, prod)."
  type        = string
  validation {
    condition     = contains(["poc", "staging", "prod"], var.environment)
    error_message = "environment doit etre poc, staging ou prod."
  }
}

variable "network_zone" {
  description = "Zone reseau Hetzner du sous-reseau (ex: eu-central pour l'Allemagne)."
  type        = string
  default     = "eu-central"
}

variable "network_cidr" {
  description = "CIDR du reseau prive. Doit englober le sous-reseau."
  type        = string
  default     = "10.0.0.0/16"
}

variable "subnet_cidr" {
  description = "CIDR du sous-reseau cloud ou sont places les serveurs."
  type        = string
  default     = "10.0.0.0/24"
}

variable "admin_source_ip" {
  description = "IP publique de l'administrateur (CIDR), autorisee a joindre le bastion en SSH. Ne jamais mettre 0.0.0.0/0."
  type        = string
}

variable "labels" {
  description = "Labels appliques aux ressources reseau."
  type        = map(string)
  default     = {}
}
