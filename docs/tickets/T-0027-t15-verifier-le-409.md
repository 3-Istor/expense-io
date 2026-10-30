---
id: T-0027
title: "T15 : vérifier que la décision perdante d'une course renvoie 409"
status: todo
risk: 1
source: review
created: 2026-10-30
links: [SEC-08, T-0024]
---

## Contexte

Vu par le relecteur de T-0024. T15 (`tests/api/authz.spec.ts`) compte exactement un 200 par paire de décisions
simultanées, mais ne vérifie pas le code de la requête perdante : un 500 passerait inaperçu. Le 409 est couvert en
test unitaire seulement.

## Critères d'acceptation

- [ ] T15 vérifie que l'autre réponse de chaque paire vaut 409.
