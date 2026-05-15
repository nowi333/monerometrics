# main.tf
# Provisionne les records DNS chez Cloudflare.

# Recupere la zone via son nom (defini hors-module, cree par le wizard Cloudflare).
# Cela evite d avoir a hardcoder le zone_id partout.
data "cloudflare_zone" "this" {
  filter = {
    name = var.zone_name
  }
}

# Records A : un par entree dans la map var.a_records.
# Le "for_each" cree autant de ressources qu il y a d entrees.
resource "cloudflare_dns_record" "a" {
  for_each = var.a_records

  zone_id = data.cloudflare_zone.this.zone_id
  name    = each.key
  content = each.value
  type    = "A"
  ttl     = var.ttl
  proxied = var.proxied
  comment = "Managed by Terraform - monerometrics infra"
}
