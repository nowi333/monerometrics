# Sprint 3C - Preuves de validation WAF ModSecurity

## Contexte
Tests d'attaque controles contre nginx + ModSecurity 3 + OWASP CRS 4.25 LTS.
Date des tests : 21 mai 2026.
Mode initial : DetectionOnly (logs only)
Mode final : On (blocage actif)

## Fichiers
- modsec_audit_detection_only.txt : journal d'audit avec 5 attaques en mode DetectionOnly (HTTP 200, regles declenchees mais pas de blocage).
- modsec_audit_blocking.txt : journal d'audit avec les memes 5 attaques en mode On (HTTP 403 retourne).

## 5 attaques testees
1. SQL Injection : ?id=1' OR '1'='1 -> regle 942100 (libinjection SQLi)
2. XSS : ?q=<script>alert(1)</script> -> regles 941100, 941110, 941160, 941390
3. Local File Inclusion : ?file=../../../etc/passwd -> regles 930100, 930110, 930120, 932160
4. Command Injection : ?cmd=;cat /etc/passwd -> regles 930120, 932160
5. Path Traversal : ?path=%252e%252e%252fetc%252fpasswd -> regles 930110, 930120

## Resultat
| Mode | Score d'anomalie cumule | Code HTTP |
|---|---|---|
| DetectionOnly | 5 a 30 (selon attaque) | 200 (page servie) |
| On | 5 a 30 | 403 (bloque par WAF) |

Trafic legitime (GET /) non impacte : HTTP 200 dans les deux modes.

## Reproductibilite
Voir config/ansible/roles/modsecurity/ pour la configuration complete.
