

variable "zone_name" {
  description = "Nom du domaine geree par Cloudflare (ex: monerometrics.net)."
  type        = string
}

variable "a_records" {
  description = "Map des records A a creer. Cle = nom court (ou @), valeur = IPv4."
  type        = map(string)
  default     = {}
}

variable "proxied" {
  description = "Si true, le trafic passe par le CDN/WAF Cloudflare. Si false, DNS only (resolution directe)."
  type        = bool
  default     = false
}

variable "ttl" {
  description = "Time To Live des records DNS (en secondes). 1 = automatique geree par Cloudflare."
  type        = number
  default     = 1
}
