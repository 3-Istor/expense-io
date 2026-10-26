# Expense.io — instructions pour les agents

SaaS B2B multi-tenant de notes de frais (Next.js 16, Auth.js, PostgreSQL 16, S3, OCR Tesseract).
Ce fichier est une carte, pas un manuel : chaque section renvoie au détail. Il est vérifié par la moulinette (S10) :
un chemin, une commande ou un skill cité ici qui n'existe plus la fait échouer.

## Avant toute tâche

1. Lire `docs/plan/PROGRESS.md` (où on en est) et le ticket visé dans `docs/tickets/` s'il y en a un.
2. Une tâche à la fois, un commit par tâche. Annoncer le **niveau de risque** (tableau plus bas) avant le code.
3. Une tâche n'est finie que si la moulinette est verte et que la preuve est rangée (`docs/evidence/<ticket>/`).

## La boucle de vérification (à lancer soi-même, avant de commiter)

| Commande | Quand | Durée |
| --- | --- | --- |
| `npm run verify -- --level fast` | après chaque modification | ~15 s |
| `npm run verify -- --level pr` | avant chaque commit (le hook `.claude/hooks/guard-commit.mjs` le fait aussi) | ~30 s |
| `npm test`, `npm run test:db`, `npm run test:api` | après un changement de code : unitaires, base réelle, API de bout en bout | ~1 min |
| `npm run risk` | avant de livrer : niveau de risque du diff et point de contrôle humain | ~2 s |
| `make sonar` | doute sur la qualité ; quality gate local, Docker requis | ~3 min |
| `npm run verify -- --level nightly`, `npm run test:mutation`, `npm run test:fuzz` | gros changement ; sinon la CI de nuit | ~10 min |

Lire `verify-summary.md`, pas les sorties brutes ; n'ouvrir `verify-report.json` que pour un contrôle en échec.
Installer les outils : `make install` (npm, puis `scripts/install-tools.sh`, versions et empreintes épinglées).
Lancer l'app : `make dev` (Docker) ou `scripts/cloud-services.sh` (sans Docker).

## Où vit le code

| Dossier | Contenu | Règle |
| --- | --- | --- |
| `src/modules/expense-notes/` | Notes de frais : `domain/` (règles pures), `application/` (cas d'usage), `infrastructure/` (Postgres, S3, OCR), `ports.ts` | Le domaine n'importe ni `pg`, ni `next`, ni l'infrastructure (S2) |
| `src/modules/identity/` | Comptes, rôles, entreprises, session | Idem |
| `src/app/api/` | Routes HTTP minces : `handle()` + `requireUser()` + un cas d'usage | Aucune logique métier, aucun SQL |
| `src/contract/` | Le contrat d'API (Zod) ; `docs/openapi.yaml` en est généré | Skill `contract-change` |
| `src/lib/` | Auth, accès base (`withUserScope`), erreurs, journaux | Niveau 3 pour `auth*` et `db.ts` |
| `migrations/` | SQL, dont les politiques RLS | Niveau 2, niveau 3 si RLS ou droits |
| `verify/` | La moulinette (S1 à S10), `risk.ts`, `supply-chain.json` | Niveau 3 : un agent n'affaiblit pas ses propres contrôles |

## Règles non négociables

- **Contrat d'API** : promis aux clients (version dans `src/contract/version.ts`). Toute modification suit le skill
  `contract-change` : oasdiff classe le changement, la version suit (rupture → majeure + ADR accepté), le changelog
  `docs/contract-changelog.md` est tenu. S5 le vérifie.
- **Isolation entre entreprises** : toute requête métier passe par `withUserScope`. Jamais de `getPool()` dans une
  route métier. Chaque route vérifie ses droits : ne jamais supposer que l'UI ou une autre route a filtré.
- **Secrets** : jamais dans le code ; `.env` et ses variantes interdits en lecture (seul `.env.example` est lisible).
- **Tests** : ne jamais supprimer ni affaiblir un test pour passer au vert. Une faille connue = test « échec attendu ».
- **Dépendances** : `npm install` respecte la quarantaine de 7 jours et ne lance aucun script d'installation
  (`.npmrc`). Un paquet critique (`verify/supply-chain.json`) vaut un niveau 3, même pour un patch.
- **Faux positifs** : jamais supprimés sans raison, preuve et date d'expiration (`docs/security/false-positives.md`).
- **Hors périmètre** : un problème vu en passant devient un ticket (skill `write-ticket`), jamais un correctif glissé
  dans le diff en cours.

## Niveau de risque d'un changement

| Niveau | Déclencheur | Humain |
| --- | --- | --- |
| 0 Cosmétique | texte d'UI, docs, style | aucun en direct |
| 1 Routine | un module, contrat inchangé, code déjà testé ; outil de dev mis à jour | lit le résumé de preuves |
| 2 Sensible | contrat, nouvel endpoint, migration, plusieurs modules, dépendance d'exécution | valide le diff du contrat avant le code |
| 3 Critique | auth, isolation, accès, RLS, secrets, CI, `verify/`, `.claude/`, paquet critique, politique des dépendances | valide le plan, relit le diff sensible |

Le plus élevé l'emporte. L'agent peut monter d'un niveau, jamais descendre. `npm run risk` calcule le niveau du diff.
Dès le niveau 2 : relecteur `security-reviewer` en contexte neuf. Détail : `docs/workflow.md`.

## Skills (chemins standard)

| Skill | Quand |
| --- | --- |
| `add-feature` | ajouter ou modifier une fonctionnalité, live coding compris |
| `contract-change` | toute modification de `src/contract/` |
| `write-ticket` | noter un travail à faire plus tard, ou ouvrir un ticket depuis l'audit |
| `write-adr` | décision qui change le contrat, l'architecture, la sécurité ou qui se défait mal |
| `triage-finding` | un constat d'outil (Semgrep, gitleaks, Sonar, npm audit, OSV, Spectral, zizmor) |

## Quand un humain manque

Écrire la question dans `docs/plan/QUESTIONS.md` (contexte, options, option prudente retenue), continuer avec
l'option prudente si elle est réversible. Irréversible : mettre la tâche de côté (ticket `blocked`) et passer à la suite.

## Git

- `origin` = fork `3-Istor/expense-io`. Le dépôt du prof est en lecture seule : ne jamais y pousser.
- Branches `phase-N/<sujet>` ou `ticket/T-NNNN-<sujet>`. PR vers le fork. Commits : impératif, le pourquoi dans le corps,
  le niveau de risque (`npm run risk`) en dernière ligne.

## Où trouver quoi

- `docs/vision.md` : la cible et les paris · `docs/workflow.md` : la boucle et les points de contrôle humains
- `docs/tickets/` : le travail à faire · `docs/evidence/` : les preuves par ticket
- `docs/adr/` : les décisions · `docs/contract.md`, `docs/contract-changelog.md` : le contrat et son histoire
- `docs/security/` : failles, faux positifs, chaîne d'approvisionnement · `docs/test-strategy.md` : ce que les tests prouvent
