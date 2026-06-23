# main.tf
# Wazuh Manager sur Oracle Cloud Always Free.
#
# Compose :
#   - 1 VCN (Virtual Cloud Network, equivalent du reseau prive)
#   - 1 Internet Gateway
#   - 1 Route Table par defaut (sortie Internet)
#   - 1 Subnet public hebergeant la VM
#   - 1 Security List (equivalent NSG) : SSH 22 + Tailscale UDP 41641
#   - 1 Instance VM.Standard.A1.Flex (ARM Ampere) 4 OCPU / 24 Go RAM
#   - cloud-init pour rejoindre le tailnet Tailscale automatiquement
#
# Le SIEM Wazuh (Manager + Indexer + Dashboard) sera installe par Ansible
# dans un second temps, via Tailscale (zero port SIEM expose publiquement).

locals {
  name_prefix = "${var.project}-${var.environment}"

  common_tags = {
    "project"     = var.project
    "managed_by"  = "terraform"
    "component"   = "wazuh-siem"
    "environment" = var.environment
  }
}

# ============================================================
# VCN : Virtual Cloud Network
# ============================================================

resource "oci_core_vcn" "wazuh" {
  compartment_id = var.compartment_ocid
  cidr_blocks    = [var.vcn_cidr]
  display_name   = "${local.name_prefix}-vcn"
  dns_label      = "wazuh"

  freeform_tags = local.common_tags
}

# ============================================================
# Internet Gateway (sortie publique)
# ============================================================

resource "oci_core_internet_gateway" "wazuh" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.wazuh.id
  display_name   = "${local.name_prefix}-igw"
  enabled        = true

  freeform_tags = local.common_tags
}

# ============================================================
# Route Table : route par defaut via Internet Gateway
# ============================================================

resource "oci_core_route_table" "wazuh" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.wazuh.id
  display_name   = "${local.name_prefix}-rt-public"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.wazuh.id
  }

  freeform_tags = local.common_tags
}

# ============================================================
# Security List : pare-feu stateful du subnet
# ============================================================
# Regles inbound :
#   - SSH 22 depuis admin_source_cidr (bootstrap initial)
#   - Tailscale UDP 41641 depuis Internet (negociation P2P WireGuard)
#   - Tout le reste DENY (defaut OCI)
# Regles outbound : tout autorise (apt, Tailscale, etc.)

resource "oci_core_security_list" "wazuh" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.wazuh.id
  display_name   = "${local.name_prefix}-sl"

  # SSH 22 inbound (sera resserrable / Tailscale-only en prod)
  ingress_security_rules {
    protocol    = "6" # TCP
    source      = var.admin_source_cidr
    source_type = "CIDR_BLOCK"
    description = "SSH initial bootstrap"

    tcp_options {
      min = 22
      max = 22
    }
  }

  # Tailscale WireGuard inbound (negociation P2P NAT traversal)
  ingress_security_rules {
    protocol    = "17" # UDP
    source      = "0.0.0.0/0"
    source_type = "CIDR_BLOCK"
    description = "Tailscale WireGuard"

    udp_options {
      min = 41641
      max = 41641
    }
  }

  # Outbound : tout
  egress_security_rules {
    protocol         = "all"
    destination      = "0.0.0.0/0"
    destination_type = "CIDR_BLOCK"
    description      = "Sortie Internet"
  }

  freeform_tags = local.common_tags
}

# ============================================================
# Subnet public
# ============================================================

resource "oci_core_subnet" "wazuh" {
  compartment_id    = var.compartment_ocid
  vcn_id            = oci_core_vcn.wazuh.id
  cidr_block        = var.subnet_cidr
  display_name      = "${local.name_prefix}-subnet-public"
  dns_label         = "public"
  route_table_id    = oci_core_route_table.wazuh.id
  security_list_ids = [oci_core_security_list.wazuh.id]

  # Pas de prohibition d IP publique : les VM du subnet pourront en avoir une.
  prohibit_public_ip_on_vnic = false

  freeform_tags = local.common_tags
}

# ============================================================
# Cloud-init : rejoint le tailnet Tailscale au boot
# ============================================================

locals {
  cloud_init = base64encode(templatefile("${path.module}/cloud-init.yaml", {
    tailscale_auth_key = var.tailscale_auth_key
    hostname           = "wazuh-oci"
  }))
}

# ============================================================
# Instance ARM Ampere A1.Flex (Always Free 4 OCPU / 24 Go)
# ============================================================

resource "oci_core_instance" "wazuh" {
  compartment_id      = var.compartment_ocid
  availability_domain = var.availability_domain
  shape               = var.instance_shape
  display_name        = "${local.name_prefix}-vm"

  shape_config {
    ocpus         = var.instance_ocpus
    memory_in_gbs = var.instance_memory_gb
  }

  source_details {
    source_type             = "image"
    source_id               = var.instance_image_ocid
    boot_volume_size_in_gbs = var.boot_volume_size_gb
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.wazuh.id
    assign_public_ip = true
    hostname_label   = "wazuh-oci"
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
    user_data           = local.cloud_init
  }

  freeform_tags = local.common_tags

  # Si la creation echoue (out-of-capacity), Terraform marquera la ressource
  # comme tainted. On peut relancer apply ou changer availability_domain.
}
