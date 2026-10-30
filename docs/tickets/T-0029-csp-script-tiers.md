---
id: T-0029
title: "CSP : limiter les scripts tiers (Umami) à leur hôte"
status: todo
risk: 3
source: review
created: 2026-10-30
links: [T-0028]
---

## Contexte

Vu par le relecteur de T-0028. Quand Umami est configuré, son script s'exécute sur l'origine de l'application sans
CSP ni SRI : un hôte Umami compromis pourrait lire les pages ou appeler l'API avec la session. Risque normal d'un
script d'analytics, mais évitable.

## Critères d'acceptation

- [ ] En-tête `Content-Security-Policy` avec `script-src 'self'` plus l'hôte Umami configuré, ou Umami auto-hébergé.
- [ ] Test : la page de connexion sert la CSP ; sans Umami, aucun hôte tiers autorisé.
