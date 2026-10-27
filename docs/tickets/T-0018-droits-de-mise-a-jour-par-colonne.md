---
id: T-0018
title: Limiter l'UPDATE du rôle applicatif aux colonnes de décision
status: todo
risk: 3
source: review
created: 2026-10-27
links: [SEC-05, SEC-13, T-0001]
---

## Contexte

`expense_app` a `UPDATE` sur toute la table `expense_notes` ; les politiques RLS filtrent les lignes, pas les colonnes.
Un futur bug SQL dans une décision pourrait réécrire `storage_key` vers l'objet d'une autre entreprise et obtenir une
URL signée vers ce reçu. Non atteignable avec les requêtes actuelles (relecture de sécurité du 2026-10-27).

## Critères d'acceptation

- [ ] Migration : `REVOKE UPDATE ON expense_notes FROM expense_app` puis `GRANT UPDATE (status, decided_by, decided_at)`.
- [ ] Test de base : un `UPDATE … SET storage_key` par le rôle applicatif est refusé.
- [ ] Suite d'API verte.

## Plan

Niveau 3 (droits) : plan validé par Brian.

## Notes
