# main.tf
# Module bastion : Resource Group dedie + IP publique + NIC + VM Ubuntu.
#
# Pattern : on cree un RG dedie au bastion pour pouvoir le detruire/recreer
# independamment du reste. lifecycle separe = robustesse en cas d incident.

locals {
  name_prefix = "${var.project}-${var.environment}-bastion"

  common_tags = merge(
    var.tags,
    {
      component  = "bastion"
      managed_by = "terraform"
    }
  )
}

# ============================================================
# Resource Group
# ============================================================

resource "azurerm_resource_group" "bastion" {
  name     = "${local.name_prefix}-rg"
  location = var.location
  tags     = local.common_tags
}

# ============================================================
# IP publique
# ============================================================
# Note securite : on garde une IP publique pour permettre l installation
# initiale de Tailscale et du hardening Ansible. Une fois Tailscale operationnel,
# on pourra desactiver l acces SSH public via NSG (TODO Sprint 3A.10).

resource "azurerm_public_ip" "bastion" {
  name                = "${local.name_prefix}-pip"
  resource_group_name = azurerm_resource_group.bastion.name
  location            = var.location
  allocation_method   = "Static"
  sku                 = "Standard"
  zones               = ["1"] # Zone-redundant pour cout maitrise

  tags = local.common_tags
}

# ============================================================
# Network Interface
# ============================================================

resource "azurerm_network_interface" "bastion" {
  name                = "${local.name_prefix}-nic"
  resource_group_name = azurerm_resource_group.bastion.name
  location            = var.location

  ip_configuration {
    name                          = "ipconfig1"
    subnet_id                     = var.subnet_id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.bastion.id
  }

  tags = local.common_tags
}

# ============================================================
# Virtual Machine Ubuntu LTS
# ============================================================

resource "azurerm_linux_virtual_machine" "bastion" {
  name                = "${local.name_prefix}-vm"
  resource_group_name = azurerm_resource_group.bastion.name
  location            = var.location
  size                = var.vm_size

  # Authentification : cle SSH UNIQUEMENT, jamais de password.
  admin_username                  = var.admin_username
  disable_password_authentication = true

  network_interface_ids = [
    azurerm_network_interface.bastion.id,
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

  # Identite managee : la VM aura une identite Azure pour interagir avec
  # d autres services (Key Vault par exemple) sans stocker de credentials.
  identity {
    type = "SystemAssigned"
  }

  # Boot diagnostics : permet de voir l ecran serie de la VM en cas de pb.
  # Storage Account "managed" = Azure gere lui meme le stockage des logs.
  boot_diagnostics {}

  tags = local.common_tags
}
