---
id: T-0008
title: Refuser un montant mal formé (« 8* », « 12abc »)
status: blocked
risk: 2
source: review
created: 2026-10-26
links: [Q10, FP-FUZZ]
---

## Contexte

Trouvé par le fuzzing : `parseFloat` accepte « 8* » (= 8). Le refuser change un succès en erreur : rupture.

Bloqué par : Q10 aux profs.

## Critères d'acceptation

- [ ] Décision des profs ; si oui : 400, version majeure, ADR accepté.

## Plan

## Notes
