---
id: T-0006
title: Validation finance après la validation manager
status: todo
risk: 3
source: audit
created: 2026-10-26
links: [Q6, C1, cours 2 phase 2]
---

## Contexte

Feature la plus probable du live coding. Elle touche un rôle (niveau 3) et l'enum `status` (rupture pour un client
qui fait un `switch` exhaustif). Deux variantes à préparer, selon la réponse à C1.

## Critères d'acceptation

- [ ] Variante A (nouveau statut) : contrat en version majeure, ADR, changelog ; S5 l'accepte.
- [ ] Variante B (champ `step`, `status` inchangé) : contrat en version mineure ; S5 l'accepte.
- [ ] Machine à états dans le domaine, testée sans base ; matrice d'autorisations étendue au rôle finance.

## Plan

Répéter les deux variantes sur des branches `rehearsal/*`, chronométrées, jamais fusionnées.

## Notes
