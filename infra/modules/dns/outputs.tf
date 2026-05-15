# outputs.tf

output "zone_id" {
  description = "ID Cloudflare de la zone."
  value       = data.cloudflare_zone.this.zone_id
}

output "zone_name" {
  description = "Nom de la zone."
  value       = data.cloudflare_zone.this.name
}

output "a_record_names" {
  description = "Liste des records A crees."
  value       = [for r in cloudflare_dns_record.a : r.name]
}
