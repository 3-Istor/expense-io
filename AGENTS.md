# Expense.io — instructions pour les agents

SaaS B2B multi-tenant de notes de frais (Next.js 16, Auth.js, PostgreSQL 16, S3, OCR Tesseract).
Projet d'architecture logicielle (ARLA) : audit puis refactorisation, avec un agent IA encadré par un harnais.
Ce fichier est une carte : il reste court. Le détail est dans `docs/`.

## Avant toute tâche

1. Lire `docs/plan/PROGRESS.md` (où on en est), puis la tâche visée dans `docs/plan/PLAN.md`.
2. Une seule tâche à la fois. Commit après chaque tâche terminée, puis mise à jour de `PROGRESS.md`.
3. Une tâche n'est finie que si son critère de fin passe, preuve à l'appui (sortie de la commande).

## Commandes

- `make dev` : installe, démarre Postgres + LocalStack (Docker), migre, peuple, lance l'app sur :3000
- `npm run lint`, `npm run typecheck`
- `npm run verify -- --level fast|pr|nightly` : la moulinette (à venir, phase 1) — c'est la définition de « vert »

## Règles non négociables

- **Contrat d'API gelé** : mêmes routes, mêmes champs JSON, mêmes codes de succès (voir `docs/contract.md`).
  Changer un code d'erreur, retirer un champ ou renommer une valeur d'enum exige un ADR validé par un humain.
- **Isolation entre entreprises** : toute requête sur une table métier passe par le contexte de l'utilisateur
  et de son entreprise. Jamais de `getPool()` brut dans une route métier. Chaque route vérifie elle-même
  ses droits : ne jamais supposer que l'UI ou une autre route a déjà filtré.
- **Architecture cible** : monolithe modulaire, hexagonale légère (`docs/vision.md`).
  Le domaine n'importe ni `pg`, ni `next`, ni l'infrastructure.
- **Secrets** : jamais dans le code, jamais lus par l'agent (`.env` et ses variantes sont interdits en lecture ;
  seul `.env.example`, qui ne contient que des valeurs de dev publiques, est lisible : décision de Brian, 2026-10-21).
- **Tests** : ne jamais supprimer ni affaiblir un test pour le faire passer. Un test qui révèle une faille
  connue est marqué « échec attendu » avec la référence de la faille, jamais supprimé.
- **Faux positifs** : ne jamais supprimer un constat d'outil sans raison, date d'expiration et preuve
  (`docs/security/false-positives.md`). Dans le doute : `docs/plan/QUESTIONS.md`.

## Niveau de risque d'un changement

| Niveau | Déclencheur | Humain |
| --- | --- | --- |
| 0 Cosmétique | texte d'UI, docs, style | aucun en direct |
| 1 Routine | un module, pas de changement de contrat, code déjà testé | lit le résumé de preuves |
| 2 Sensible | contrat, nouvel endpoint, migration, plusieurs modules | valide le diff du contrat avant le code |
| 3 Critique | auth, isolation, règles d'accès, RLS, secrets, CI, `verify/`, `.claude/` | valide le plan, relit le diff sensible |

Le niveau le plus élevé déclenché l'emporte. L'agent peut monter d'un niveau, jamais descendre.
Annoncer le niveau et les points de contrôle humains AVANT de coder.

## Quand un humain manque

Écrire la question dans `docs/plan/QUESTIONS.md` (contexte, options, option prudente retenue), continuer
avec l'option prudente si elle est réversible. Si la décision est irréversible : mettre la tâche de côté
et passer à la suivante.

## Git

- `origin` = fork `3-Istor/expense-io`. Le repo du prof (`upstream`) est en lecture seule : ne jamais y pousser.
- Branches `phase-N/<sujet>`. PR toujours vers le fork : `gh pr create --repo 3-Istor/expense-io`.
- Messages de commit : impératif, une ligne de résumé, le pourquoi dans le corps.

## Où trouver quoi

- `docs/vision.md` : la cible et les paris du projet
- `docs/plan/` : `PLAN.md`, `PROGRESS.md`, `QUESTIONS.md`
- `docs/adr/` : décisions d'architecture (format Nygard)
- `docs/contract.md` : le contrat actuel des 14 endpoints
