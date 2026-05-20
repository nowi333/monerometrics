# outputs.tf

output "resource_group_name" {
  description = "Nom du Resource Group de l edge."
  value       = azurerm_resource_group.edge.name
}

output "vm_id" {
  description = "ID complet Azure de la VM edge."
  value       = azurerm_linux_virtual_machine.edge.id
}

output "vm_name" {
  description = "Nom de la VM edge."
  value       = azurerm_linux_virtual_machine.edge.name
}

output "public_ip_address" {
  description = "IP publique de l edge. Sera referencee par les records DNS Cloudflare."
  value       = azurerm_public_ip.edge.ip_address
}

output "private_ip_address" {
  description = "IP privee de l edge dans le subnet DMZ."
  value       = azurerm_network_interface.edge.private_ip_address
}

output "admin_username" {
  description = "Nom d utilisateur admin pour SSH initial."
  value       = var.admin_username
}

output "ssh_command_initial" {
  description = "Commande SSH pour le bootstrap initial via IP publique."
  value       = "ssh -i ~/.ssh/monerometrics/bastion ${var.admin_username}@${azurerm_public_ip.edge.ip_address}"
}
