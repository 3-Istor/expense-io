---
id: T-0017
title: Déplacer les anciens reçus sous une clé opaque
status: todo
risk: 2
source: review
created: 2026-10-27
links: [SEC-13, T-0001]
---

## Contexte

T-0001 stocke les nouveaux reçus sous `receipts/<uuid>.<ext>`. Les notes créées avant gardent leur fichier sous
`receipts/<n>.<ext>` (`storage_key` nul) : prévisible si la liste du bucket fuit ou si le bucket est mal configuré.
Par l'API, le contrôle de périmètre empêche déjà tout accès (relecture de sécurité du 2026-10-27).

## Critères d'acceptation

- [ ] Script ponctuel, rejouable : copie chaque objet vers une clé opaque, remplit `storage_key`, vérifie la copie.
- [ ] Puis `storage_key` passe en `NOT NULL` et les anciens objets sont supprimés.
- [ ] `receiptKey` exposé par l'API ne change pas (contrat).

## Plan

## Notes
