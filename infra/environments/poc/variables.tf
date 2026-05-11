# variables.tf
# Variables d entree de l environment POC.

variable "admin_source_ip" {
  description = "IP publique de l administrateur (CIDR /32). Autorisee a se connecter au bastion SSH."
  type        = string
}
