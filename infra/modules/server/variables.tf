

variable "project" {
  description = "Nom du projet (prefixe des ressources)."
  type        = string
}

variable "environment" {
  description = "Environnement (poc, staging, prod)."
  type        = string
}

variable "role" {
  description = "Role fonctionnel du serveur (bastion, edge, k3s). Sert au nom, au label et a l'application du firewall."
  type        = string
}

variable "location" {
  description = "Datacenter Hetzner (ex: nbg1 = Nuremberg, fsn1 = Falkenstein, hel1 = Helsinki)."
  type        = string
  default     = "nbg1"
}

variable "server_type" {
  description = "Type de serveur Hetzner. Rester sur une gamme x86 (cx*, cpx*) pour la compatibilite des images Docker amd64."
  type        = string
  default     = "cx23"
}

variable "image" {
  description = "Image systeme."
  type        = string
  default     = "ubuntu-24.04"
}

variable "ssh_keys" {
  description = "Liste des noms (ou IDs) de cles SSH Hetzner a injecter au boot (sur root)."
  type        = list(string)
}

variable "admin_username" {
  description = "Utilisateur d'administration non-root cree par cloud-init (cible Ansible)."
  type        = string
  default     = "nowi333"
}

variable "admin_ssh_public_key" {
  description = "Cle publique SSH (contenu OpenSSH) autorisee pour l'utilisateur admin."
  type        = string
}

variable "network_id" {
  description = "ID du reseau prive auquel rattacher le serveur."
  type        = string
}

variable "private_ip" {
  description = "IP privee fixe du serveur dans le sous-reseau."
  type        = string
}

variable "public_ipv4_enabled" {
  description = "Active une IPv4 publique. Sur k3s : conservee pour le trafic sortant, mais le firewall bloque toute entree."
  type        = bool
  default     = true
}

variable "public_ipv6_enabled" {
  description = "Active une IPv6 publique."
  type        = bool
  default     = true
}

variable "data_volume_size" {
  description = "Taille du volume de donnees en Go. 0 = pas de volume."
  type        = number
  default     = 0
}

variable "labels" {
  description = "Labels additionnels appliques aux ressources du serveur."
  type        = map(string)
  default     = {}
}
