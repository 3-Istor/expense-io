---
id: T-0005
title: Réglages GitHub de sécurité (administrateur)
status: todo
risk: 3
source: review
created: 2026-10-26
links: [docs/security/supply-chain.md]
---

## Contexte

Une partie de la politique ne vit pas dans le code : protection de `main`, alertes, auto-merge. L'agent n'a pas les
droits d'administration. Liste complète : `docs/security/supply-chain.md`, section « À faire une fois ».

## Critères d'acceptation

- [ ] Protection de `main` : PR obligatoire, checks obligatoires, revue des Code Owners.
- [ ] Dependency graph, Dependabot alerts, secret scanning, push protection, signalement privé activés.
- [ ] Variable `DEPENDENCY_GRAPH_ENABLED=true` ; « Allow auto-merge » activé.
- [ ] Deuxième propriétaire dans `.github/CODEOWNERS`.

## Plan

## Notes
