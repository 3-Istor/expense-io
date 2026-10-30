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

## Relecture en contexte neuf (security-reviewer)

Rien de bloquant : contrat et codes inchangés, INSERT toujours fait par un RH, RLS vérifiée en base (autre entreprise,
sans contexte, `company_id` ou `changed_by` usurpés refusés ; UPDATE et DELETE refusés). Corrigé avant fusion :

- clés étrangères en cascade ou à NULL : l'historique ne bloque plus la suppression d'un compte par un administrateur
  (test : suppression d'un employé ayant un historique) ;
- comparaison sur le manager relu en base : un UUID en majuscules identique n'est plus tracé (test d'API et unitaire) ;
- politique d'insertion : l'employé et les managers doivent appartenir à l'entreprise de la trace (test).

Ouvert : T-0023, auto-rattachement d'un manager avec un UUID en majuscules (défaut antérieur, hors de ce diff).
- Totaux : 119 tests unitaires, 235 tests d'API, test:db vert, moulinette `pr` verte.
