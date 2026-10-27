---
id: T-0016
title: "S5 : l'ajout d'une valeur d'enum en réponse est une mineure"
status: done
risk: 3
source: prof
created: 2026-10-26
links: [Q6, T-0006, "coaching 2026-10-26"]
---

## Contexte

S5 classe en rupture tout ce qu'oasdiff signale en avertissement, dont `response-property-enum-value-added`. Une
nouvelle valeur de `status` (validation finance, T-0006) exigerait donc une version majeure et un ADR.

Réponse du coaching du 2026-10-26 (Q6) : « ajouter dans un enum, ce n'est pas une majeure, c'est une mineure ; par
contre enlever dans un enum, c'est une majeure ». La règle de S5 doit suivre la règle des profs.

## Critères d'acceptation

- [x] `verify/lib/contract-version.ts` : l'ajout d'une valeur d'enum dans une réponse est classé « ajout »
      (mineure) ; le retrait reste une rupture ; tout autre avertissement d'oasdiff reste une rupture.
- [x] Deux scénarios ajoutés à `tests/unit/contract-version.test.ts` (ajout de valeur → mineure ; retrait → majeure).
- [x] ADR 0006 « Ajout de valeur d'enum = mineure », accepté par Brian le 2026-10-27.
- [x] `docs/contract.md` et le skill `contract-change` mentionnent la règle.

## Plan

Liste blanche d'identifiants oasdiff traités comme ajouts, testée ; le reste de la classification ne change pas.
Niveau 3 (`verify/`) : plan validé par Brian, relecteur en contexte neuf.

## Notes

Le risque d'un client strict (`switch` exhaustif) est réel : il est documenté dans l'ADR et dans le changelog de la
version qui ajoute la valeur, comme le recommande la loi de Hyrum.

## Clôture (2026-10-27)

Identifiants oasdiff observés en ajoutant puis retirant `paid` dans `ExpenseNoteStatus` :
`response-property-enum-value-added` (oasdiff : erreur, 8 opérations) et `response-property-enum-value-removed`
(oasdiff : info). La politique ramène le premier à « ajout » et remonte le second à « rupture » (le coaching le dit,
et l'agent peut monter un niveau, jamais descendre sans décision humaine : ADR 0006). Preuve : `docs/evidence/T-0016/`.
