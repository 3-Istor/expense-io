# T-0023 — Preuve : auto-rattachement en majuscules refusé

Date : 2026-10-30 · Niveau 3 (règles de rattachement) · Décision de Brian : corriger avant le clonage.

- Test d'API `T-0023` (`tests/api/manager-history.spec.ts`) : `PUT /api/hr/users/{id}/manager` avec l'UUID du manager
  lui-même en majuscules. Sur l'ancien code : **200** (le manager devenait son propre manager). Après correctif : **409**,
  le code déjà au contrat, rien n'est modifié ni tracé.
- Tests unitaires du domaine : `parseManagerAssignment` normalise en minuscules ; `checkManagerAssignment` détecte
  l'auto-rattachement quelle que soit la casse.
- Totaux : 119 tests unitaires, 236 tests d'API, test:db vert, moulinette `pr` verte.
