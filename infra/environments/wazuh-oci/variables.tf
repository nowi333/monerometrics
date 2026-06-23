# variables.tf
# Interface de l environnement wazuh-oci.

# ============================================================
# Authentification OCI (OCID non sensibles)
# ============================================================

variable "tenancy_ocid" {
  description = "OCID du tenancy OCI (= compartment racine pour le Always Free)."
  type        = string
}

variable "user_ocid" {
  description = "OCID de l utilisateur OCI proprietaire de la cle API."
  type        = string
}

variable "fingerprint" {
  description = "Fingerprint de la cle API OCI."
  type        = string
}

variable "private_key_path" {
  description = "Chemin local vers la cle privee API OCI (hors repo)."
  type        = string
  default     = "~/.oci/oci_api_key.pem"
}

variable "region" {
  description = "Region OCI."
  type        = string
  default     = "eu-frankfurt-1"
}

variable "compartment_ocid" {
  description = "OCID du compartment ou creer les ressources (= tenancy pour Always Free)."
  type        = string
}

# ============================================================
# Placement et capacite
# ============================================================

variable "availability_domain" {
  description = "Availability Domain cible. AD-1 par defaut, changer en AD-2/AD-3 si out-of-capacity."
  type        = string
  default     = "oNGr:EU-FRANKFURT-1-AD-1"
}

variable "instance_shape" {
  description = "Shape de la VM. A1.Flex = ARM Ampere, eligible Always Free."
  type        = string
  default     = "VM.Standard.A1.Flex"
}

variable "instance_ocpus" {
  description = "Nombre d OCPUs. 4 = max Always Free."
  type        = number
  default     = 4
}

variable "instance_memory_gb" {
  description = "RAM en Go. 24 = max Always Free (OpenSearch gourmand)."
  type        = number
  default     = 24
}

variable "boot_volume_size_gb" {
  description = "Taille du boot volume en Go (dans les 200 Go gratuits)."
  type        = number
  default     = 50
}

variable "instance_image_ocid" {
  description = "OCID de l image Ubuntu 24.04 ARM (aarch64) a Frankfurt."
  type        = string
  default     = "ocid1.image.oc1.eu-frankfurt-1.aaaaaaaay35rggrgfzvsxzl54k7rcd3bb67u4x25ioihwt42upleppnvlvgq"
}

# ============================================================
# Reseau et acces
# ============================================================

variable "vcn_cidr" {
  description = "CIDR du VCN OCI. Distinct du reseau prive Hetzner (10.0.0.0/16) pour eviter tout chevauchement Tailscale."
  type        = string
  default     = "10.20.0.0/16"
}

variable "subnet_cidr" {
  description = "CIDR du subnet public hebergeant la VM Wazuh."
  type        = string
  default     = "10.20.1.0/24"
}

variable "ssh_public_key" {
  description = "Cle publique SSH (meme que le bastion Hetzner) autorisee sur la VM."
  type        = string
}

variable "admin_source_cidr" {
  description = "CIDR source autorise pour SSH 22 sur l IP publique (bootstrap initial). Restreindre en prod."
  type        = string
  default     = "0.0.0.0/0"
}

variable "tailscale_auth_key" {
  description = "Auth key Tailscale (reutilisable) pour rejoindre le tailnet via cloud-init. Sensible."
  type        = string
  sensitive   = true
}

# ============================================================
# Identite
# ============================================================

variable "project" {
  description = "Nom du projet (prefixe des ressources)."
  type        = string
  default     = "monerometrics"
}

variable "environment" {
  description = "Environnement logique."
  type        = string
  default     = "wazuh-oci"
}
