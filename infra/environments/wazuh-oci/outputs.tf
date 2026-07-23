

output "instance_id" {
  description = "OCID de l instance Wazuh."
  value       = oci_core_instance.wazuh.id
}

output "public_ip" {
  description = "IP publique de la VM Wazuh (bootstrap initial SSH + Tailscale handshake)."
  value       = oci_core_instance.wazuh.public_ip
}

output "private_ip" {
  description = "IP privee OCI de la VM."
  value       = oci_core_instance.wazuh.private_ip
}

output "ssh_command_initial" {
  description = "Commande SSH initiale via IP publique (avant que Tailscale soit operationnel)."
  value       = "ssh ubuntu@${oci_core_instance.wazuh.public_ip}"
}

output "vcn_id" {
  description = "OCID du VCN."
  value       = oci_core_vcn.wazuh.id
}

output "availability_domain_used" {
  description = "AD effectivement utilise pour le placement."
  value       = var.availability_domain
}
