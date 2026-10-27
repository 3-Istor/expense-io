---
id: T-0014
title: Router vers le RH les notes d'un utilisateur sans manager
status: done
risk: 3
source: prof
created: 2026-10-26
links: [Q5, T08, "coaching 2026-10-26"]
---

## Contexte

Le RH ne valide que les notes des managers « racine » (`role = 'manager' AND manager_id IS NULL`). Un employé sans
manager, ou un RH sans RH au-dessus, n'est proposé à personne : ses notes restent `pending` pour toujours (test T08).
C'est exactement la panne du cours 4 (« le statut reste pending pour toujours ») : invisible pour l'infrastructure,
bloquante pour le client.

Réponse du coaching du 2026-10-26 (Q5) : « c'est du fonctionnel, pas du contrat ». Aucune route, aucun code HTTP,
aucun champ ne change : seule la liste des notes que voit le RH s'élargit.

## Critères d'acceptation

- [x] Règle dans le domaine (fonction pure, testée sans base) : une note sans manager au-dessus de son auteur est
      validée par un RH de la même entreprise, jamais par son auteur (SEC-06).
- [x] Employé sans manager : sa note apparaît dans `GET /api/hr/expense-notes` et le RH peut la valider (200).
- [x] RH sans RH au-dessus : sa note est visible et validable par un autre RH de l'entreprise, jamais par lui-même.
- [x] RH d'une autre entreprise : toujours 404 (matrice d'autorisations étendue, isolation intacte).
- [x] T08 réécrit pour le nouveau comportement ; suite de contrat et oasdiff : aucun changement.

## Plan

1. `domain/approvers.ts` : prédicat `needsHrApproval(author)` = pas de manager au-dessus.
2. `SCOPE.hr` dans `pg-expense-note-repository.ts` : `u.manager_id IS NULL AND en.user_id <> $1` + même entreprise
   (le filtre `role = 'manager'` disparaît) ; la RLS suit (migration 0006, le refus de sa propre note y est ajouté).
3. Tests : unitaires du prédicat, API (trois cas ci-dessus), matrice régénérée.

Niveau 3 (accès) : plan validé par Brian, relecteur `security-reviewer`.

## Notes

L'`operationId` `listRootManagerPendingNotes` garde son nom (le renommer serait une rupture) ; seule sa description
change, ce qu'oasdiff classe en patch (contrat 1.1.x, entrée au changelog).

Cas limite à trancher par Brian : un RH seul dans son entreprise. Option prudente : sa note reste en attente et
apparaît dans la métrique « plus vieille note en attente » (T-0015), au lieu d'une auto-validation.

## Clôture (2026-10-27)

Décision de Brian : « un root est un mec sans manager », tous rôles. RH seul : la note reste en attente (option prudente).
La RLS filtrait elle aussi sur `role = 'manager'` : sans la migration 0006, le dépôt aurait vu la note mais la base
aurait refusé la décision. Contrat 1.1.2 (descriptions seulement). Preuve : `docs/evidence/T-0014/`.
