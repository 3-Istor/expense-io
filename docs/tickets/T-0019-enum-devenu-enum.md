---
id: T-0019
title: "S5 : restreindre une réponse à un enum (became-enum) reste une mineure"
status: todo
risk: 3
source: review
created: 2026-10-27
links: [T-0016, "ADR 0006"]
---

## Contexte

Vu par le relecteur sécurité de T-0016. oasdiff classe `response-property-became-enum` et
`response-mediatype-became-enum` en info : un champ libre restreint à une liste de valeurs passe en mineure. C'est une
restriction proche d'un retrait de valeur, mais pas un retrait au sens de l'ADR 0006. Comportement antérieur à T-0016.

## Critères d'acceptation

- [ ] Décision humaine : ces deux identifiants restent en mineure, ou passent en rupture (ajout à `BREAKING_BY_POLICY`).
- [ ] Si rupture : un test par identifiant dans `tests/unit/contract-version.test.ts`, ADR 0006 complété.

## Plan

Aucun code avant la décision. Niveau 3 (`verify/`).
