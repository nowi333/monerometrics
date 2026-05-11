# variables.tf
# Variables d entree du module bootstrap.

variable "project" {
  description = "Nom du projet, utilise comme prefixe sur toutes les ressources."
  type        = string
  default     = "monerometrics"
}

variable "location" {
  description = "Region Azure principale du projet."
  type        = string
  default     = "francecentral"
}

# Tags appliques a toutes les ressources.
# Bonne pratique FinOps : permet de filtrer les couts par projet/owner/env.
variable "tags" {
  description = "Tags Azure appliques a toutes les ressources."
  type        = map(string)
  default = {
    project     = "monerometrics"
    managed_by  = "terraform"
    cost_center = "education"
    component   = "iac-bootstrap"
  }
}
