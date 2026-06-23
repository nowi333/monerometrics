# backend.tf
# State local pour cet environnement (le backend Azure Blob historique a ete
# retire lors de la migration hors d'Azure). Le fichier terraform.tfstate est
# gitignore. Cible production : backend distant chiffre (ex. S3-compatible OCI).

# (Aucun bloc backend => Terraform utilise le state local par defaut.)
