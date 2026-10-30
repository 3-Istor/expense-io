---
id: T-0023
title: "Un manager peut être rattaché à lui-même avec un UUID en majuscules"
status: todo
risk: 3
source: review
created: 2026-10-30
links: [SEC-14, T-0020]
---

## Contexte

Vu par le relecteur sécurité de T-0020, défaut antérieur. `parseManagerAssignment` accepte un UUID en majuscules
(regex `/i` de `src/shared/ids.ts`), mais `checkManagerAssignment` compare `managerId === targetId` en tenant compte de
la casse, et la requête de cycle part du manager du manager demandé. `PUT /api/hr/users/{idManager}/manager` avec
`{"managerId": "<même id en MAJUSCULES>"}` rattache donc un manager à lui-même (cycle de longueur 1, SEC-14).

## Critères d'acceptation

- [ ] Les UUID sont normalisés en minuscules à la lecture (domaine) ; l'auto-rattachement en majuscules renvoie le 409
      déjà au contrat.
- [ ] Test d'API du scénario, et test unitaire de `checkManagerAssignment` avec un UUID en majuscules.

## Plan

Normaliser dans `parseManagerAssignment` (et la cible dans le cas d'usage). Contrat inchangé (409 existant). Niveau 3
(règles d'accès, rattachement).
