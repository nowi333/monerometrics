# Outputs du module compute/k3s

output "private_ip_address" {
  description = "IP privee de la VM k3s (utilisee par nginx edge pour proxy_pass)."
  value       = azurerm_network_interface.k3s.private_ip_address
}

output "vm_id" {
  description = "ID Azure de la VM k3s."
  value       = azurerm_linux_virtual_machine.k3s.id
}

output "resource_group_name" {
  description = "Nom du resource group k3s."
  value       = azurerm_resource_group.k3s.name
}

output "ssh_proxy_jump_command" {
  description = "Commande SSH avec ProxyJump via bastion."
  value       = "ssh -J noe@<bastion-pub-ip> noe@${azurerm_network_interface.k3s.private_ip_address}"
}

output "data_disk_id" {
  description = "ID du data disk attache (utilise pour montage Ansible)."
  value       = azurerm_managed_disk.k3s_data.id
}

output "data_disk_lun" {
  description = "LUN du data disk (utilise par Linux pour identifier le device)."
  value       = azurerm_virtual_machine_data_disk_attachment.k3s_data.lun
}
