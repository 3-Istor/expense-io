---
id: T-0024
title: "Les politiques RLS de mise à jour des valideurs ne bornent pas le statut"
status: todo
risk: 3
source: review
created: 2026-10-30
links: [SEC-05, SEC-08, T-0014]
---

## Contexte

Vu par le relecteur sécurité de la répétition 4 (remboursement), défaut antérieur. `expense_notes_manager_update`
(`migrations/1700000000002_rls-par-entreprise.sql`) et `expense_notes_hr_no_manager_update`
(`migrations/1700000000006_rh-valide-les-auteurs-sans-manager.sql`) n'ont ni condition sur `status` ni `WITH CHECK` :
sous le rôle `expense_app`, un valideur peut réécrire une note déjà décidée (ou, avec le statut `reimbursed`, la marquer
remboursée). Seul le SQL applicatif (`DECIDE_IN_SCOPE`, `en.status = 'pending'`) l'empêche ; une injection SQL suffirait.

## Critères d'acceptation

- [ ] Les deux politiques n'acceptent que `pending` en `USING` et `approved`/`rejected` en `WITH CHECK`.
- [ ] Test sous `SET LOCAL ROLE expense_app` (modèle T17b) : un valideur ne peut pas modifier une note décidée ou
      remboursée ; contrôle positif sur une note en attente.
