# versions.tf
# Environnement wazuh-oci : VM ARM Ampere A1 sur Oracle Cloud (Always Free)
# hebergeant le SIEM Wazuh. State isole (blast radius separe).

terraform {
  required_version = ">= 1.15.0"

  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 6.0"
    }
  }
}

# Provider OCI : lit les credentials depuis ~/.oci/config (profil DEFAULT).
provider "oci" {
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.fingerprint
  private_key_path = var.private_key_path
  region           = var.region
}
