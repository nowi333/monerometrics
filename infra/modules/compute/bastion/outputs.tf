# outputs.tf

output "resource_group_name" {
  description = "Nom du Resource Group du bastion."
  value       = azurerm_resource_group.bastion.name
}

output "vm_id" {
  description = "ID complet Azure de la VM bastion."
  value       = azurerm_linux_virtual_machine.bastion.id
}

output "vm_name" {
  description = "Nom de la VM bastion."
  value       = azurerm_linux_virtual_machine.bastion.name
}

output "public_ip_address" {
  description = "IP publique du bastion (utilisee uniquement pour le bootstrap initial Ansible)."
  value       = azurerm_public_ip.bastion.ip_address
}

output "private_ip_address" {
  description = "IP privee du bastion dans le subnet Mgmt."
  value       = azurerm_network_interface.bastion.private_ip_address
}

output "admin_username" {
  description = "Nom d utilisateur admin pour SSH initial."
  value       = var.admin_username
}

output "ssh_command_initial" {
  description = "Commande SSH a utiliser pour le bootstrap initial via IP publique."
  value       = "ssh -i ~/.ssh/monerometrics/bastion ${var.admin_username}@${azurerm_public_ip.bastion.ip_address}"
}
