"""Les plages Cloudflare figurent a deux endroits : le pare-feu Hetzner
(Terraform) et le filtre d'origine nginx (Ansible). Une plage ajoutee d'un seul
cote laisserait passer du trafic d'un cote et le refuserait de l'autre."""
import re
import sys

CIDR = re.compile(r'(?<![0-9a-f:.])[0-9a-f:.]+/\d+')

tf = open('infra/modules/network/main.tf').read()
tf_block = tf[tf.index('cloudflare_ips = ['):]
tf_ips = set(CIDR.findall(tf_block[:tf_block.index(']')]))

nginx = open('config/ansible/roles/letsencrypt/templates/monerometrics-tls.conf.j2').read()
geo = nginx[nginx.index('geo $mm_origin_allowed'):]
geo = geo[:geo.index('}')]
# Les reseaux internes (Tailscale, prive, boucle locale) ne sont pas des
# plages Cloudflare : ils n'ont pas a figurer dans le pare-feu Hetzner.
INTERNAL = {'100.64.0.0/10', '10.0.0.0/8', '127.0.0.1/32', '::1/128'}
nginx_ips = set(CIDR.findall(geo)) - INTERNAL

if tf_ips != nginx_ips:
    print('Terraform seulement :', sorted(tf_ips - nginx_ips))
    print('nginx seulement     :', sorted(nginx_ips - tf_ips))
    sys.exit(1)
print(f'{len(tf_ips)} plages Cloudflare identiques des deux cotes')
