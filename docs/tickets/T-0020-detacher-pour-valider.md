---
id: T-0020
title: "Un RH peut détacher un employé de son manager, puis valider sa note"
status: todo
risk: 3
source: review
created: 2026-10-27
links: [T-0014, ADR 0002]
---

## Contexte

Vu par le relecteur sécurité de T-0014. La règle « auteur sans manager → RH » se lit au moment de la décision. Le RH
peut mettre `manager_id` à `null` (`PUT /api/hr/users/{id}/manager`), valider la note en attente, puis rattacher de
nouveau l'employé. Seul `decided_by` en garde la trace ; le changement de rattachement n'est pas journalisé. Avant
T-0014, le contournement n'existait que pour les notes de managers. Reste dans l'entreprise du RH (pas de fuite).

## Critères d'acceptation

- [ ] Décision de Brian entre : (a) refuser le détachement tant que l'auteur a une note `pending` (409, code déjà au
      contrat de cette route) ; (b) accepter et tracer chaque changement de rattachement (qui, quand, avant, après) ;
      (c) figer le valideur à la soumission (colonne `approver_kind`), plus lourd.
- [ ] Test d'API du scénario : détacher puis valider, comportement conforme à la décision.

## Plan

Aucun code avant la décision. Option prudente proposée : (b), réversible et sans effet sur le contrat.
