# variables.tf
# Variables d entree de l environment POC.

variable "admin_source_ip" {
  description = "IP publique de l administrateur (CIDR /32). Autorisee a se connecter au bastion SSH."
  type        = string
}

# Cle publique SSH du bastion. Le pendant prive vit dans ~/.ssh/monerometrics/bastion.
# Passee via terraform.tfvars (qui est gitignored).
variable "bastion_ssh_public_key" {
  description = "Cle publique SSH (format OpenSSH) autorisee a se connecter au bastion."
  type        = string
}
