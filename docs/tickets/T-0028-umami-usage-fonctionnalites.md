---
id: T-0028
title: "Mesurer l'usage des fonctionnalités dans l'interface (Umami)"
status: done
risk: 3
source: human
created: 2026-10-30
links: [T-0021, "docs/slo.md"]
---

## Contexte

Demande de Brian : savoir si une fonctionnalité est réellement utilisée (et la retirer sinon), avec un outil qu'on peut
brancher. Les métriques serveur (`/metrics`) comptent les appels ; Umami mesure l'usage dans l'interface.

## Critères d'acceptation

- [x] Script Umami chargé seulement si `UMAMI_SCRIPT_URL` (https) et `UMAMI_WEBSITE_ID` (UUID) sont fixés.
- [x] Sans cookie ni donnée personnelle (`data-do-not-track`, paramètres d'URL exclus).
- [x] Événements sur les boutons clés : suggestion OCR, soumission, approbation, rejet.
- [x] Tests unitaires de la configuration ; `.env.example` et `docs/slo.md` documentés.
