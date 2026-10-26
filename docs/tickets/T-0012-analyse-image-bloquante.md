---
id: T-0012
title: Rendre bloquante l'analyse de l'image sur les vulnérabilités corrigeables
status: todo
risk: 3
source: session
created: 2026-10-26
links: ["PR #10"]
---

## Contexte

OSV-Scanner sur l'image de production remonte des paquets Debian 12 (glibc, gzip, coreutils…) sans correctif publié.
L'analyse est donc informative. Deux pistes : ne bloquer que sur les vulnérabilités qui ont un correctif, ou une image
d'exécution plus petite (distroless ou Alpine) qui embarque moins de paquets.

## Critères d'acceptation

- [ ] L'étape échoue si une vulnérabilité de l'image a un correctif disponible.
- [ ] La suite de contrat passe toujours contre le conteneur.

## Plan

## Notes
