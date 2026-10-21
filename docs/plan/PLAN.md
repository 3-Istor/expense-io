# Plan d'exécution

Source : document « Expense.io — Vision, harnais IA et plan d'exécution » (validé le 2026-10-20).
Règle : une tâche à la fois, commit à la fin, mise à jour de `PROGRESS.md`. Une tâche est finie quand son
critère passe et que la preuve (sortie de commande) est collée dans `PROGRESS.md`.

## Phase 0 — Kit de départ (fait par une session humaine + agent)

- [x] 0.1 `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json` (interdits Git et secrets)
- [x] 0.2 `docs/plan/` (PLAN, PROGRESS, QUESTIONS), `docs/contract.md`, `docs/adr/` (modèle + ADR 0001)
- [x] 0.3 `renovate.json` (mises à jour hebdomadaires, alertes de sécurité immédiates)

## Phase 1 — Kit et filet de sécurité (agent seul, ~2 fenêtres de 5 h)

Objectif : tout changement futur doit prouver qu'il ne casse rien. Ne modifier AUCUN comportement de l'app.

- [x] 1.1 Environnement de test : Vitest (unitaires), Playwright en mode requêtes HTTP (API), base de test via
      docker compose. Critère : `npm test` et `npm run test:api` passent avec un test de fumée chacun.
- [x] 1.2 Squelette de la moulinette `verify/` : CLI `npm run verify -- --level fast|pr|nightly`, un module par
      contrôle, rapport `verify-report.json` + `verify-summary.md` (≤ 20 lignes). Contrôles de départ : S1 (tsc,
      ESLint), S2 (dependency-cruiser, règles en avertissement tant que la phase 3 n'est pas faite), S3 (gitleaks),
      S4 (knip, jscpd). Critère : `npm run verify -- --level fast` produit le résumé.
- [x] 1.3 Tests de caractérisation du contrat : les 14 endpoints de `docs/contract.md`, statuts et formats JSON
      actuels, y compris les codes 401/403 actuels. Critère : tous verts sur le code actuel.
- [x] 1.4 Matrice d'autorisations : fixtures à deux entreprises (A et B : RH, manager racine, employé rattaché,
      employé sans manager, second RH), scénarios T01–T18 de la task A. Les scénarios qui révèlent une faille
      sont marqués `test.fail` avec la référence de la faille (ex. `SEC-03`). Critère : suite exécutée, liste des
      échecs attendus recopiée dans `docs/audit/avant/authz.md`.
- [x] 1.5 OpenAPI de l'existant : `docs/openapi.yaml` (OpenAPI 3.1) décrivant l'existant à l'identique ;
      Redocly lint ; règles Spectral maison en avertissement ; validation de chaque réponse des tests 1.3 contre
      le schéma. Critère : spec valide, toutes les réponses conformes.
- [x] 1.6 CI GitHub Actions : Postgres et LocalStack en services, `npm run verify -- --level pr` sur chaque PR ;
      workflow `nightly` (squelette, planifié). Critère : CI verte sur la PR de la phase 1.
- [x] 1.7 Audit « avant » : lancer jscpd, knip, Semgrep (règles TypeScript + règles maison), gitleaks,
      OSV-Scanner ; archiver sorties, commandes et versions dans `docs/audit/avant/`. Critère : `docs/audit/avant/README.md`
      résume les chiffres avec la commande pour les reproduire.

Point de contrôle humain : relire `docs/contract.md`, `docs/openapi.yaml` et la liste des tests (30 min).

## Phase 2 — Correctifs de sécurité (agent seul)

Les 15 correctifs du document de vision, un commit chacun, chacun faisant passer un test marqué « échec attendu ».
Fiches d'audit au format : ID, titre, CWE, catégorie OWASP API Top 10, CVSS v4.0, preuve, correctif, statut.
Politique de faux positifs appliquée (`docs/security/false-positives.md`).

## Phase 3 — Architecture cible (agent seul, branche `phase-3/architecture`)

Monolithe modulaire, hexagonale légère (`docs/vision.md`). Le contrat ne bouge pas, sauf ADR. Chaque tâche finit
par les 67 tests d'API et la moulinette `pr` au vert.

- [x] 3.1 Module `expense-notes` : domaine pur (note, machine à états, règles des valideurs), ports, cas d'usage,
      adaptateurs (PostgreSQL, S3, OCR). Les 9 routes de notes deviennent minces (lire la requête, appeler le cas
      d'usage, traduire le résultat). Critère : tests verts, `src/modules/expense-notes/domain` sans import technique.
- [x] 3.2 Module `identity` : utilisateur, rôle, annuaire, rattachement de manager, appelant courant.
      Critère : idem, les 3 routes RH utilisateurs et l'authentification passent par le module.
- [x] 3.3 Trace des décisions : migration `decided_by`, `decided_at`, écrites par le cas d'usage de décision.
      Critère : test qui lit la trace en base après une décision.
- [x] 3.4 Code mort supprimé (ancienne façade `src/domain`, `src/ports`, `src/adapters`, `src/utils`) ; knip à 0 fichier
      inutilisé, seuils resserrés. Règles dependency-cruiser des modules, S2 bloquant.
- [-] 3.5 ~~Erreurs RFC 9457~~ : abandonnée, format `{error}` conservé (décision de Brian, risque sur la moulinette).
- [x] 3.6 Contrat déclaré dans le code (ADR 0001) : schémas Zod, OpenAPI généré, la CI vérifie qu'il est à jour.
- [x] 3.7 Audit « après » : `scripts/audit.sh docs/audit/apres`, comparaison avec « avant ».

## Phase 4 — Run, qualité et durabilité (agent seul, branche `phase-4/run`)

Contrainte (décision de Brian, 2026-10-21) : contrat d'API strictement inchangé, donc **aucun endpoint ajouté**
(`/api/health` et `/metrics` en question aux profs). Les sondes utilisent `/login`.

- [x] 4.1 Build de production reproductible (polices locales, instrumentation compatible Edge) et `Dockerfile`
      multi-étapes non-root ; job CI `image` : construit l'image, migre depuis l'image, la démarre avec le compte
      limité et sans `AUTH_SECRET`, puis lance la suite de contrat contre le conteneur.
- [-] 4.2 ~~Manifestes Kubernetes~~ : retirés (décision de Brian, 2026-10-21 : pas demandé explicitement ; « kube » en
      question aux profs, Q8). S7 ne contrôle plus que le Dockerfile (hadolint).
- [x] 4.3 Journaux structurés (JSON, identifiant d'erreur) et SLO écrit (`docs/slo.md`).
- [x] 4.4 SonarQube local sans compte (`make sonar-up`, `make sonar`, `sonar-project.properties`, couverture lcov).
- [ ] 4.5 Niveau `nightly` de la moulinette (Schemathesis, Stryker).

## Phase 5 — Workflow piloté par le risque (agent, branche `phase-5/qualite`)

Objectif : le jour du live coding, chaque demande suit un chemin connu et chronométré, et le harnais empêche
l'agent de se tromper sans le voir.

- [x] 5.1 `verify/risk.ts` : classe un diff dans les niveaux 0 à 3 d'`AGENTS.md`, avec les raisons et les points de
      contrôle humains ; `npm run risk` ; contrôle S8 (informatif) ; tests unitaires des règles.
- [ ] 5.2 Skills d'équipe (`.claude/skills/`) : `add-feature`, `triage-finding`, `write-adr`.
- [ ] 5.3 Hooks (`.claude/settings.json`) : pas de commit si la moulinette `pr` est rouge ; résumé de risque en fin de tour.
- [ ] 5.4 Relecteurs en contexte neuf (`.claude/agents/`) : sécurité et architecture, lecture seule.
- [ ] 5.5 Carte du workflow (`docs/workflow.md`, schéma pour la soutenance).
- [ ] 5.6 Trois répétitions chronométrées sur des branches jetables (validation finance, export CSV, plafond par
      catégorie) ; temps, points de friction et correctifs du harnais dans `docs/rehearsals.md`.

## Phase 6 — Soutenance (équipe, agent en appui)

Rapport « après », skill `slides` d'équipe, deck, une fiche par personne, simulation du jury.

## Phase 7 — Bonus : kit générique

Skill `equip-harness`, repo `3-Istor/skills`, application à un second projet de l'équipe.
