# Progression

Format d'une entrée : date, tâche, ce qui a été fait, preuve (commande + résultat), ce qui reste.
Une session qui démarre lit ce fichier en premier.

## 2026-10-20 — Phase 0 terminée

- Kit de départ posé sur la branche `harness/phase-0-kit` : `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json`,
  `renovate.json`, `docs/plan/`, `docs/contract.md`, `docs/adr/`, `docs/security/false-positives.md`.
- Point de départ : commit `265924b` (code d'origine du prof, non modifié).
- Prochaine tâche : **1.1** (environnement de test).

## 2026-10-20 — Tâche 1.1 terminée (niveau de risque 1)

- Branche `phase-1/harness`, partie de `harness/phase-0-kit`.
- Vitest 3 (`vitest.config.ts`, alias `@/`) et Playwright 1.64 en mode requêtes HTTP (`playwright.config.ts`,
  lance `next dev` sauf si `API_BASE_URL` est fourni). Scripts `npm test` et `npm run test:api`.
- Preuves :
  - `npm test` → `Test Files 1 passed (1) · Tests 1 passed (1)`
  - `npm run test:api` → `✓ GET /api/expense-notes sans session renvoie 401 · 1 passed`
  - `npm run typecheck` et `npm run lint` : aucune erreur.
- Reste : la base de test via docker compose n'est pas encore branchée (le test de fumée n'en a pas besoin).
  À faire au début de la tâche 1.3, qui en a besoin : démarrer `dockerd` dans la session cloud
  (`dockerd > /tmp/dockerd.log 2>&1 &`), puis `docker compose up -d`, `npm run migrate:up`, `npm run seed`.
- Prochaine tâche : **1.2** (squelette de la moulinette `verify/`).
