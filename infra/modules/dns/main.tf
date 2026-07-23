

data "cloudflare_zone" "this" {
  filter = {
    name = var.zone_name
  }
}

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
