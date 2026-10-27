---
id: T-0006
title: Validation finance après la validation manager
status: todo
risk: 3
source: audit
created: 2026-10-26
links: [Q6, C1, T-0016, cours 2 phase 2, "coaching 2026-10-26"]
---

## Contexte

Feature la plus probable du live coding. Elle touche un rôle (niveau 3) et l'enum `status`. Coaching du 2026-10-26 :
ajouter une valeur d'enum est une **mineure** (retirer une valeur serait une majeure). La variante A devient donc la
variante par défaut, dès que S5 suit cette règle (T-0016).

## Critères d'acceptation

- [ ] Variante A (nouveau statut `paid`) : contrat en version mineure, changelog ; S5 l'accepte (après T-0016).
- [ ] Variante B (champ `step`, `status` inchangé) : gardée en repli si T-0016 n'est pas fusionné à temps.
- [ ] Machine à états dans le domaine, testée sans base ; matrice d'autorisations étendue au rôle finance.

## Plan

Répéter la variante A sur une branche `rehearsal/*`, chronométrée, jamais fusionnée ; la variante B une fois en repli.

## Notes
