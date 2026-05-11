# main.tf
# Module network monerometrics.
#
# Cree :
#   - 1 VNet
#   - N subnets (parametre via var.subnets)
#   - N NSG associes 1-1 aux subnets (un NSG par subnet, contrôle granulaire)
#   - 1 route table optionnelle (forced tunneling via OPNsense)
#
# Convention : chaque ressource est nommee {project}-{environment}-{role}
# Exemple : monerometrics-poc-vnet, monerometrics-poc-snet-dmz

# ============================================================
# Locals : valeurs derivees, utilisees plusieurs fois
# ============================================================

locals {
  # Prefixe utilise dans tous les noms.
  name_prefix = "${var.project}-${var.environment}"

  # Fusionne les tags par defaut avec ceux fournis par l appelant.
  # Tag systematique component=network pour filtrer les couts.
  common_tags = merge(
    var.tags,
    {
      component  = "network"
      managed_by = "terraform"
    }
  )
}

# ============================================================
# Virtual Network
# ============================================================

resource "azurerm_virtual_network" "main" {
  name                = "${local.name_prefix}-vnet"
  location            = var.location
  resource_group_name = azurerm_resource_group.network.name
  address_space       = [var.vnet_cidr]
  tags                = local.common_tags
}

# Resource Group dedie aux ressources reseau.
# Pattern : chaque domaine fonctionnel a son propre RG (network, compute, data, observability).
# Avantages : isolation, lifecycle separe, IAM granulaire, suppression simplifiee.
resource "azurerm_resource_group" "network" {
  name     = "${local.name_prefix}-rg-network"
  location = var.location
  tags     = local.common_tags
}

# ============================================================
# Subnets : un par role fonctionnel
# ============================================================

# for_each itere sur la map var.subnets.
# Chaque entree devient une ressource Azure indexee par sa cle (dmz, app, etc.).
resource "azurerm_subnet" "this" {
  for_each = var.subnets

  name                 = "${local.name_prefix}-snet-${each.key}"
  resource_group_name  = azurerm_resource_group.network.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [each.value]
}

# ============================================================
# Network Security Groups : un par subnet
# ============================================================

# Pourquoi un NSG par subnet et pas un global ?
# - Defense en profondeur : compromis du subnet App ne donne pas l acces au subnet Data.
# - Lecture facile : on sait directement quel NSG regarder pour quel subnet.
# - Pas de regles "transverses" complexes a debugger.

resource "azurerm_network_security_group" "this" {
  for_each = var.subnets

  name                = "${local.name_prefix}-nsg-${each.key}"
  location            = var.location
  resource_group_name = azurerm_resource_group.network.name
  tags                = local.common_tags
}

# Association NSG <-> Subnet
resource "azurerm_subnet_network_security_group_association" "this" {
  for_each = var.subnets

  subnet_id                 = azurerm_subnet.this[each.key].id
  network_security_group_id = azurerm_network_security_group.this[each.key].id
}

# ============================================================
# Regles de securite par subnet
# ============================================================

# DMZ : accepte le trafic Internet sur 443/80 vers OPNsense
resource "azurerm_network_security_rule" "dmz_allow_https" {
  name                        = "allow-https-from-internet"
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_ranges     = ["80", "443"]
  source_address_prefix       = "Internet"
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.network.name
  network_security_group_name = azurerm_network_security_group.this["dmz"].name
}

# Mgmt : accepte SSH depuis l IP de l administrateur uniquement
# Critique : on ne met JAMAIS 0.0.0.0/0 ici.
resource "azurerm_network_security_rule" "mgmt_allow_ssh_admin" {
  name                        = "allow-ssh-from-admin"
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "22"
  source_address_prefix       = var.admin_source_ip
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.network.name
  network_security_group_name = azurerm_network_security_group.this["mgmt"].name
}

# App : accepte le trafic depuis la DMZ (nginx -> k3s)
resource "azurerm_network_security_rule" "app_allow_from_dmz" {
  name                        = "allow-https-from-dmz"
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "443"
  source_address_prefix       = var.subnets["dmz"]
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.network.name
  network_security_group_name = azurerm_network_security_group.this["app"].name
}

# App : SSH depuis le subnet Mgmt (bastion)
resource "azurerm_network_security_rule" "app_allow_ssh_from_mgmt" {
  name                        = "allow-ssh-from-mgmt"
  priority                    = 110
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "22"
  source_address_prefix       = var.subnets["mgmt"]
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.network.name
  network_security_group_name = azurerm_network_security_group.this["app"].name
}

# Data : accepte le trafic applicatif depuis le subnet App uniquement
resource "azurerm_network_security_rule" "data_allow_from_app" {
  name                        = "allow-app-from-app-subnet"
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_ranges     = ["5432", "18081"] # Postgres, monerod RPC
  source_address_prefix       = var.subnets["app"]
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.network.name
  network_security_group_name = azurerm_network_security_group.this["data"].name
}

# Data : SSH depuis le subnet Mgmt
resource "azurerm_network_security_rule" "data_allow_ssh_from_mgmt" {
  name                        = "allow-ssh-from-mgmt"
  priority                    = 110
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "22"
  source_address_prefix       = var.subnets["mgmt"]
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.network.name
  network_security_group_name = azurerm_network_security_group.this["data"].name
}

# Monitoring : accepte les agents Wazuh / Prometheus / Loki depuis tous les subnets internes
resource "azurerm_network_security_rule" "monitoring_allow_agents" {
  name                        = "allow-agents-from-vnet"
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_ranges     = ["1514", "1515", "9090", "3100"] # Wazuh, Prometheus, Loki
  source_address_prefix       = var.vnet_cidr
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.network.name
  network_security_group_name = azurerm_network_security_group.this["monitoring"].name
}

# Monitoring : SSH depuis Mgmt
resource "azurerm_network_security_rule" "monitoring_allow_ssh_from_mgmt" {
  name                        = "allow-ssh-from-mgmt"
  priority                    = 110
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "22"
  source_address_prefix       = var.subnets["mgmt"]
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.network.name
  network_security_group_name = azurerm_network_security_group.this["monitoring"].name
}

# Regle deny-all explicite sur tous les NSG (priority 4096, plus elevee = applique en dernier).
# Azure a une regle deny implicite par defaut, mais une regle explicite :
# - Apparait dans les rapports d audit
# - Permet d ajouter des deny specifiques avant si besoin
resource "azurerm_network_security_rule" "deny_all_inbound" {
  for_each = var.subnets

  name                        = "deny-all-inbound"
  priority                    = 4096
  direction                   = "Inbound"
  access                      = "Deny"
  protocol                    = "*"
  source_port_range           = "*"
  destination_port_range      = "*"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.network.name
  network_security_group_name = azurerm_network_security_group.this[each.key].name
}

# ============================================================
# Route Table (forced tunneling via OPNsense)
# ============================================================
# Conditionnelle : on ne l active que quand OPNsense est deploye.
# Sinon, les VM en cours de provisioning ne peuvent pas joindre Azure pour leur installation.

resource "azurerm_route_table" "forced_tunneling" {
  count = var.enable_forced_tunneling ? 1 : 0

  name                = "${local.name_prefix}-rt-forced-tunneling"
  location            = var.location
  resource_group_name = azurerm_resource_group.network.name
  tags                = local.common_tags
}

resource "azurerm_route" "default_via_opnsense" {
  count = var.enable_forced_tunneling ? 1 : 0

  name                   = "default-via-opnsense"
  resource_group_name    = azurerm_resource_group.network.name
  route_table_name       = azurerm_route_table.forced_tunneling[0].name
  address_prefix         = "0.0.0.0/0"
  next_hop_type          = "VirtualAppliance"
  next_hop_in_ip_address = var.opnsense_internal_ip
}

# Association de la route table aux subnets internes (pas DMZ ni Mgmt
# qui ont besoin de sortir directement sur Internet pour leurs services).
resource "azurerm_subnet_route_table_association" "internal_subnets" {
  for_each = var.enable_forced_tunneling ? toset(["app", "data", "monitoring"]) : toset([])

  subnet_id      = azurerm_subnet.this[each.key].id
  route_table_id = azurerm_route_table.forced_tunneling[0].id
}
