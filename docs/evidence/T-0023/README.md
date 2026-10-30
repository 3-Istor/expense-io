# T-0023 — Preuve : auto-rattachement en majuscules refusé

Date : 2026-10-30 · Niveau 3 (règles de rattachement) · Décision de Brian : corriger avant le clonage.

- Test d'API `T-0023` (`tests/api/manager-history.spec.ts`) : `PUT /api/hr/users/{id}/manager` avec l'UUID du manager
  lui-même en majuscules. Sur l'ancien code : **200** (le manager devenait son propre manager). Après correctif : **409**,
  le code déjà au contrat, rien n'est modifié ni tracé.
- Tests unitaires du domaine : `parseManagerAssignment` normalise en minuscules ; `checkManagerAssignment` détecte
  l'auto-rattachement quelle que soit la casse.
- Totaux : 119 tests unitaires, 236 tests d'API, test:db vert, moulinette `pr` verte.

## Relecture en contexte neuf (security-reviewer)

Rien de bloquant : contrat identique (le `managerId` renvoyé est relu en base), aucun 200 légitime ne devient une
erreur, cycles inchangés, toutes les autres comparaisons portent sur des colonnes `uuid`. Remarque appliquée :
l'événement `manager.changed` reprend l'identifiant relu en base plutôt que la saisie de l'URL.
