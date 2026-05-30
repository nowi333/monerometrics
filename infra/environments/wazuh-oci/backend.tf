# backend.tf
# State distant sur Azure Blob (meme storage account que l infra Azure,
# cle dediee wazuh-oci.tfstate). Coherence : tous les states au meme endroit,
# chiffres et versionnes. Le state OCI reste logiquement isole par sa cle.

terraform {
  backend "azurerm" {
    resource_group_name  = "rg-monerometrics-tfstate"
    storage_account_name = "stmonerometricstfdezfto"
    container_name       = "tfstate"
    key                  = "wazuh-oci.tfstate"
  }
}
