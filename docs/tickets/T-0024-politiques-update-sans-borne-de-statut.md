---
id: T-0024
title: "Les politiques RLS de mise à jour des valideurs ne bornent pas le statut"
status: done
risk: 3
source: review
created: 2026-10-30
links: [SEC-05, SEC-08, T-0014, "répétition 4"]
---

## Contexte

Vu par le relecteur sécurité de la répétition 4 (remboursement), défaut antérieur. `expense_notes_manager_update` et
`expense_notes_hr_no_manager_update` n'avaient ni condition sur `status` ni `WITH CHECK` propre : sous le rôle
`expense_app`, un valideur pouvait réécrire une note déjà décidée. Seul le SQL applicatif (`en.status = 'pending'`)
l'empêchait ; une injection SQL aurait suffi.

## Critères d'acceptation

- [x] Les deux politiques n'acceptent que `pending` en `USING`, et `approved`/`rejected` en `WITH CHECK`, avec
      `decided_by` = l'appelant et le même périmètre (migration 0008).
- [x] Test sous `SET LOCAL ROLE expense_app` (T17d) : note décidée non modifiable, passage à `pending` ou au nom d'un
      autre refusé, contrôle positif sur une note en attente ; pour le manager et pour le RH.
