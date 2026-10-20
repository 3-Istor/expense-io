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

## 2026-10-20 — Tâche 1.2 terminée (niveau de risque 3, plan validé par Brian)

- `verify/cli.ts` (`npm run verify -- --level fast|pr|nightly [--record]`), un fichier par contrôle dans
  `verify/checks/`, seuils dans `verify/config.json` (cliquet), règles d'architecture dans `.dependency-cruiser.cjs`.
- Sorties : `verify-report.json`, `verify-summary.md` (ignorés par git), `docs/metrics/history.csv` avec `--record`.
- Preuves :
  - `--level fast` → VERT : S1 OK, S2 OK, S3 NON EXÉCUTÉ (gitleaks absent).
  - `--level pr --record` → VERT : S4 « duplication 17.4 %, 7 fichiers et 0 export inutilisés » ; première ligne
    écrite dans `docs/metrics/history.csv`.
  - Règle d'architecture prouvée : un fichier de test `src/domain/` important `pg` donne
    « S2 ÉCHEC — domaine-sans-infrastructure : src/domain/_violation_test.ts → node_modules/pg » (fichier retiré).
- Points d'attention :
  - **Duplication : 17,4 % avec jscpd 5.4.1**, contre 14,8 % mesurés le 13 octobre avec jscpd 4. Même code, version
    d'outil différente : toujours citer la version de l'outil avec un chiffre (audit « avant », tâche 1.7).
  - **gitleaks** n'a pas pu être téléchargé dans cette session (GitHub bloque l'accès au repo de l'outil). S3 se
    déclare « non exécuté » au lieu de passer en silence. La CI (1.6) l'installera via l'action officielle, et la
    baseline des secrets déjà connus (SEC-02) sera créée dans `docs/audit/avant/gitleaks-baseline.json`.
  - Les 7 « fichiers inutilisés » de knip incluent `src/domain`, `src/ports`, `src/adapters`, `src/utils` : c'est
    l'architecture de façade relevée dans l'audit.
- Prochaine tâche : **1.3** (tests de caractérisation du contrat ; démarrer `dockerd` d'abord).

## 2026-10-20 — Tâche 1.3 terminée (niveau de risque 1 : tests seulement, aucun code de l'app modifié)

- `tests/api/contract.spec.ts` : 39 tests sur les 14 endpoints (succès, 400, 401, 403, 404, 409 du contrat),
  clés JSON exactes vérifiées. Chaque exécution crée sa propre entreprise (`tests/support/fixtures.ts`) : pas de
  dépendance au seed ni d'un test à l'autre. Connexion réelle par Auth.js (`/api/auth/callback/credentials`).
- `tests/support/env.ts` : base et S3 de test passés à `next dev` par `playwright.config.ts` (pas de `.env` requis ;
  valeurs publiques de `docker-compose.yml`, surchargeables par la CI).
- Preuves :
  - `npm run test:api` → `40 passed (27.7s)` (39 de contrat + le test de fumée).
  - Les tests mordent : `PUT /api/hr/users/{id}/manager` modifié pour renvoyer 400 au lieu de 409 →
    `Expected: 409 · Received: 400 · 1 failed` ; modification annulée (`git checkout`).
  - `npm run verify -- --level fast` → VERT ; `npm test` → 1 passed.
- Environnement de la session cloud : Docker Hub est bloqué par le proxy. Remplacement local équivalent :
  Postgres 16 natif (`/usr/lib/postgresql/16`, port 5433, rôle `expense` **superutilisateur** comme dans
  l'image Docker) et moto (`pip install 'moto[server]'`, `moto_server -p 4567`) à la place de LocalStack.
  La CI (1.6) utilisera les images Docker du compose.
- Hors périmètre volontaire : les failles d'autorisation (ex. reçu d'une note hors équipe lisible par un manager)
  sont pour la matrice 1.4 ; le paramètre `sort` (injection SQL) n'est testé que dans son usage par défaut.
- **Constat à verser à l'audit (1.4/1.7)** : l'app se connecte à Postgres avec le rôle créé par `POSTGRES_USER`,
  qui est superutilisateur. Un superutilisateur ignore la RLS, même avec `FORCE ROW LEVEL SECURITY` : les
  politiques de la migration ne protègent rien en l'état. L'isolation repose entièrement sur les `WHERE` des routes.
- Prochaine tâche : **1.4** (matrice d'autorisations à deux entreprises, failles marquées `test.fail`).
