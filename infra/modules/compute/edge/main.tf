# main.tf
# Module edge : Resource Group dedie + IP publique + NIC + VM Ubuntu pour nginx.
#
# Pattern : RG dedie a l edge pour pouvoir le detruire/recreer independamment
# du reste. Cohesion fonctionnelle = robustesse en cas d incident applicatif
# (perte de nginx ne touche pas le bastion/k3s).
#
# Securite : l edge est la seule VM exposee publiquement avec HTTPS. Le NSG
# du subnet DMZ autorise deja 80+443 depuis Internet (gere par module network).
# Le hardening (CIS L1, fail2ban, ufw) sera applique par Ansible role 'common',
# puis nginx + ModSecurity par roles 'nginx' et 'letsencrypt'.

locals {
  name_prefix = "${var.project}-${var.environment}-edge"

  common_tags = merge(
    var.tags,
    {
      component  = "edge"
      managed_by = "terraform"
    }
  )
}

# ============================================================
# Resource Group
# ============================================================

resource "azurerm_resource_group" "edge" {
  name     = "${local.name_prefix}-rg"
  location = var.location
  tags     = local.common_tags
}

# ============================================================
# IP publique
# ============================================================
# IP publique necessaire car l edge sert le trafic HTTPS public (origin
# pull depuis Cloudflare). L IP sera reference par le DNS Cloudflare
# en mode proxy (orange cloud).

resource "azurerm_public_ip" "edge" {
  name                = "${local.name_prefix}-pip"
  resource_group_name = azurerm_resource_group.edge.name
  location            = var.location
  allocation_method   = "Static"
  sku                 = "Standard"
  zones               = ["1"] # Zone-redundant pour cout maitrise

  tags = local.common_tags
}

# ============================================================
# Network Interface
# ============================================================

resource "azurerm_network_interface" "edge" {
  name                = "${local.name_prefix}-nic"
  resource_group_name = azurerm_resource_group.edge.name
  location            = var.location

  ip_configuration {
    name                          = "ipconfig1"
    subnet_id                     = var.subnet_id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.edge.id
  }

  tags = local.common_tags
}

# ============================================================
# Virtual Machine Ubuntu LTS
# ============================================================

resource "azurerm_linux_virtual_machine" "edge" {
  name                = "${local.name_prefix}-vm"
  resource_group_name = azurerm_resource_group.edge.name
  location            = var.location
  size                = var.vm_size

  # Authentification : cle SSH UNIQUEMENT, jamais de password.
  admin_username                  = var.admin_username
  disable_password_authentication = true

  network_interface_ids = [
    azurerm_network_interface.edge.id,
  ]

  admin_ssh_key {
    username   = var.admin_username
    public_key = var.ssh_public_key
  }

  os_disk {
    name                 = "${local.name_prefix}-osdisk"
    caching              = "ReadWrite"
    storage_account_type = var.os_disk_storage_type
    disk_size_gb         = var.os_disk_size_gb
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "ubuntu-24_04-lts"
    sku       = var.ubuntu_version
    version   = "latest"
  }

  # Identite managee : la VM aura une identite Azure pour pouvoir
  # interagir avec d autres services (Key Vault, Storage) sans credentials.
  identity {
    type = "SystemAssigned"
  }

  # Boot diagnostics : permet de voir l ecran serie en cas de pb (utile si
  # nginx ou TLS plantent au boot et bloquent l acces SSH).
  boot_diagnostics {}

  tags = local.common_tags
}
