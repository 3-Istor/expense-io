# Audit « avant » — chiffres outillés

Relevé le 2026-10-20 sur le **code d'origine** : `src/` identique au commit `265924b` (vérifié par
`git log -1 -- src`). Chaque chiffre vient d'un outil déterministe. Sorties brutes, commandes et versions
dans `raw/` (`raw/commands.txt`).

Reproduire : `scripts/audit.sh docs/audit/avant` (le même script produira `docs/audit/apres` après la phase 3).

## Les chiffres

| Mesure | Valeur | Outil (version) |
| --- | --- | --- |
| Duplication | **17,4 %** : 385 lignes dupliquées sur 2 213, 31 clones, 38 fichiers | jscpd 5.4.1, `--min-tokens 40` |
| Fichiers jamais importés | **7** : tout `src/domain/User.ts`, `src/ports/*`, `src/adapters/*`, `src/utils/*` | knip 6.42.1 |
| Constats de sécurité statiques | **18** dans 13 fichiers (5 règles maison sur 6 déclenchées) | Semgrep 1.181.0, `.semgrep/` |
| Dépendances vulnérables (prod) | **3** : 1 critique, 2 élevées | npm audit (npm 10.9.4) |
| Failles d'autorisation prouvées | **11** tests en échec attendu (10 garde-fous verts) | Playwright, `docs/audit/avant/authz.md` |

À citer avec la version : jscpd 4 mesurait 14,8 % sur le même code (brief du 13 octobre). L'écart vient de l'outil.

## Constats Semgrep (règles maison `.semgrep/expense-io.yml`)

| Règle | Nb | Où | Réf. |
| --- | --- | --- | --- |
| `sql-fragment-concatene` | 1 | `api/expense-notes/route.ts:45` (`ORDER BY ${sort}`) | SEC-01 |
| `secret-en-dur` | 1 | `lib/auth.ts:8` (`AUTH_SECRET`) | SEC-02 |
| `pool-brut-dans-une-route` | 7 | `hr/users`, `hr/users/{id}/manager` (×4), `manager/…/receipt-url`, `expense-notes` POST | SEC-03, SEC-04, SEC-05 |
| `stacktrace-dans-la-reponse` | 1 | `lib/errors.ts:5` | SEC-07 |
| `promesse-renvoyee-sans-await-dans-try` | 7 | les 7 routes qui font `return withUserScope(...)` | constat nouveau, avec SEC-07 |
| `route-sans-controle-de-session` | 0 | les 13 routes appellent `auth()` (règle vérifiée sur une route sonde sans `auth()`) | — |

Lecture : la route qui contient SEC-03 (reçu côté manager) est aussi une de celles qui court-circuitent
`withUserScope`. Le motif « requête hors du contexte utilisateur » prédit les failles d'isolation.

## Dépendances (npm audit, dépendances de production)

| Paquet | Version | Gravité max | Avis | Correctif | Exposition chez nous |
| --- | --- | --- | --- | --- | --- |
| `next` | 16.3.5 | critique | GHSA-vcvr-r3jv-pc5j (RCE dans `next/og`), + 6 avis bas à élevé | 16.3.8 (mineure) | `next/og` non utilisé ; les autres avis restent à trier |
| `sharp` | (via next) | élevée | GHSA-wq5f-xc86-pv6w | ≥ 0.35.5 | pas de traitement d'image côté serveur hors Next |
| `source-map-js` | 1.2.1 (via tailwind, postcss) | élevée | GHSA-68fv-2mgg-jv7q | ≥ 1.2.2 | build seulement |

Politique (`docs/security/false-positives.md`) : on ne supprime aucun de ces constats. La montée de `next` en
16.3.8 est un changement de niveau 3 (framework). Renovate la proposera, avec le label `risque-3`.

## Non exécuté dans cette session (et pourquoi)

| Outil | Raison | Où il tournera |
| --- | --- | --- |
| gitleaks (secrets, historique Git) | binaire non téléchargeable (proxy de la session) | CI, action officielle (tâche 1.6) |
| OSV-Scanner (base OSV, plus large que npm audit) | binaire et API `api.osv.dev` bloqués | CI (tâche 1.6) |
| Semgrep, règles du registre (`p/typescript`, `p/owasp-top-ten`) | `semgrep.dev` bloqué ; seules les règles maison ont tourné | CI (tâche 1.6) |

Le secret en dur (SEC-02) est quand même établi par Semgrep, et prouvé exploitable par le test T18b.
