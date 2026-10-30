---
id: T-0022
title: "Semgrep : imposer un contrôle d'accès aux routes hors de src/app/api"
status: todo
risk: 3
source: review
created: 2026-10-30
links: [T-0021]
---

## Contexte

Vu par le relecteur sécurité de T-0021. Les règles Semgrep « contrôle de session dans chaque route » ne couvrent que
`src/app/api/**/route.ts`. `/metrics` (`src/app/metrics/route.ts`) a son propre contrôle (`scrapeAllowed`), mais une
future route d'exploitation posée hors de `src/app/api/` ne serait signalée par aucune règle.

## Critères d'acceptation

- [ ] Une règle Semgrep exige `requireUser` ou `scrapeAllowed` dans tout `src/app/**/route.ts` hors `api/auth`.
- [ ] Un cas de test de la règle (route sans contrôle → constat).

## Plan

Niveau 3 (`.semgrep/`) : plan validé par Brian avant le code.
