

variable "admin_source_ip" {
  description = "IP publique de l'administrateur (CIDR /32), autorisee a joindre le bastion en SSH. Recuperer via: curl ifconfig.me"
  type        = string
}

variable "bastion_ssh_public_key" {
  description = "Cle publique SSH (format OpenSSH) injectee sur les 3 serveurs."
  type        = string
}

variable "location" {
  description = "Datacenter Hetzner (nbg1 = Nuremberg, fsn1 = Falkenstein, hel1 = Helsinki)."
  type        = string
  default     = "nbg1"
}

variable "network_zone" {
  description = "Zone reseau Hetzner du sous-reseau prive."
  type        = string
  default     = "eu-central"
}

variable "bastion_server_type" {
  description = "Type du bastion (faible charge)."
  type        = string
  default     = "cx23"
}

variable "edge_server_type" {
  description = "Type de l'edge (nginx + WAF + dashboard statique)."
  type        = string
  default     = "cx23"
}

variable "k3s_server_type" {
  description = "Type du noeud k3s (monerod + worker + PostgreSQL + API). 4 vCPU / 8 Go conseilles."
  type        = string
  default     = "cx33"
}

variable "k3s_data_volume_size" {
  description = "Taille du volume de donnees k3s en Go (blockchain pruned + PostgreSQL)."
  type        = number
  default     = 128
}
