# Module compute/k3s
# VM dans le subnet app (10.0.10.0/24), pas d IP publique.
# Acces SSH uniquement via ProxyJump depuis bastion (subnet mgmt).

# === RESOURCE GROUP DEDIE ===
# RG separe pour isoler le lifecycle k3s du reste (destroy/recreate).
resource "azurerm_resource_group" "k3s" {
  name     = "${var.project}-${var.environment}-k3s-rg"
  location = var.location
  tags = merge(var.tags, {
    component = "k3s"
  })
}

# === NIC : IP PRIVEE UNIQUEMENT ===
# Pas d IP publique. La VM est joignable uniquement depuis le VNet.
resource "azurerm_network_interface" "k3s" {
  name                = "${var.project}-${var.environment}-k3s-nic"
  location            = azurerm_resource_group.k3s.location
  resource_group_name = azurerm_resource_group.k3s.name

  ip_configuration {
    name                          = "ipconfig1"
    subnet_id                     = var.subnet_id
    private_ip_address_allocation = "Dynamic"
  }

  tags = merge(var.tags, {
    component = "k3s"
  })
}

# === VM K3S ===
resource "azurerm_linux_virtual_machine" "k3s" {
  name                  = "${var.project}-${var.environment}-k3s-vm"
  location              = azurerm_resource_group.k3s.location
  resource_group_name   = azurerm_resource_group.k3s.name
  size                  = var.vm_size
  admin_username        = var.admin_username
  network_interface_ids = [azurerm_network_interface.k3s.id]

  admin_ssh_key {
    username   = var.admin_username
    public_key = var.ssh_public_key
  }

  identity {
    type = "SystemAssigned"
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
    disk_size_gb         = 30
    name                 = "${var.project}-${var.environment}-k3s-osdisk"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "ubuntu-24_04-lts"
    sku       = "server"
    version   = "latest"
  }

  tags = merge(var.tags, {
    component = "k3s"
  })
}

# === DATA DISK : storage applicatif separe ===
# Standard SSD 128 Go pour monerod (~80 Go pruned) + Postgres (~15 Go) + buffer.
# Choix Standard SSD (vs Premium) optimise pour budget Azure for Students.
# En production : Premium SSD pour IOPS dedie sur la base PostgreSQL.
resource "azurerm_managed_disk" "k3s_data" {
  name                 = "${var.project}-${var.environment}-k3s-data-disk"
  location             = azurerm_resource_group.k3s.location
  resource_group_name  = azurerm_resource_group.k3s.name
  storage_account_type = "StandardSSD_LRS"
  create_option        = "Empty"
  disk_size_gb         = 128

  tags = merge(var.tags, {
    component = "k3s"
    purpose   = "applicative-data"
  })
}

resource "azurerm_virtual_machine_data_disk_attachment" "k3s_data" {
  managed_disk_id    = azurerm_managed_disk.k3s_data.id
  virtual_machine_id = azurerm_linux_virtual_machine.k3s.id
  lun                = 0
  caching            = "ReadWrite"
}
