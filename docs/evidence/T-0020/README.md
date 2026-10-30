# T-0020 — Preuve : historique des changements de manager

Date : 2026-10-30 · Niveau 3 (migration, RLS) · Décision de Brian : option (b), tracer.

## Ce qui change

- Migration 0007 : table `manager_changes` (entreprise, employé, manager avant, manager après, auteur, date), RLS
  forcée, droits `SELECT, INSERT` seulement pour le rôle applicatif.
- `assignManager` (adaptateur PostgreSQL) écrit la ligne dans la même transaction que le changement, seulement si le
  manager change vraiment ; le cas d'usage émet `manager.changed` dans les journaux.
- Réponse de `PUT /api/hr/users/{id}/manager` inchangée ; contrat inchangé (S5).

## Tests

- `tests/api/manager-history.spec.ts` :
  - changement → une ligne (avant, après, auteur, entreprise) ; même manager → aucune ligne ; détachement → une ligne ;
  - en base, rôle applicatif : un RH de l'entreprise voit la ligne, un RH d'une autre entreprise et l'employé n'en
    voient aucune ; un employé ne peut pas insérer de fausse trace ; un RH ne peut ni modifier ni effacer l'historique.
- `tests/unit/identity-use-cases.test.ts` : événement émis pour un changement effectif, pas pour une réaffectation
  identique.
- Totaux : 119 tests unitaires, 235 tests d'API (233 + 2), test:db vert, moulinette `pr` verte.
