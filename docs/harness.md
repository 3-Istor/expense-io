# Le harnais de l'agent, et d'où viennent ses choix

Le harnais est tout ce qui entoure le modèle pour qu'il réussisse du premier coup et qu'un humain n'ait à relire que
ce qui compte. On ne l'a pas inventé : chaque pièce reprend une pratique publiée en 2026, adaptée à un monolithe
modulaire, une équipe de 3 à 6 personnes et un contrat d'API qu'on ne casse pas.

## Le cadre : guides et capteurs

Birgitta Böckeler (Thoughtworks) décrit un harnais en deux familles ([Harness Engineering, martinfowler.com,
avril 2026](https://martinfowler.com/articles/harness-engineering.html)) :

- les **guides** orientent l'agent avant qu'il agisse (conventions, skills) ;
- les **capteurs** observent après et lui permettent de se corriger (tests, linters, relecture).

Chacun est soit **calculé** (déterministe, rapide : tests, linters, analyse de structure), soit **inféré** (jugement
d'un modèle : relecture par IA). Sans capteurs, les règles ne sont jamais vérifiées ; sans guides, l'agent répète
ses erreurs. Elle recommande de garder la qualité « à gauche » : le rapide avant l'intégration, le coûteux dans le
pipeline.

## Ce qu'on a pris, et comment on l'a adapté

| Pratique | Source | Chez nous | Adaptation |
| --- | --- | --- | --- |
| Un fichier d'instructions court, qui est une carte et non un manuel | OpenAI, Harness engineering (2026) ; Böckeler | `AGENTS.md` (< 100 lignes) renvoie à `docs/` | En français, tableau des niveaux de risque en tête |
| La doc du dépôt est la source de vérité de l'agent, et elle est vérifiée | OpenAI | S10 confronte les guides au dépôt (chemins, commandes, skills) | Échec si une instruction est périmée (« à venir ») |
| Frontières d'architecture imposées par des règles mécaniques | OpenAI (couches contrôlées) ; Böckeler (fitness functions) | S2, 6 règles dependency-cruiser bloquantes | Hexagonale légère par module, pas de couches globales |
| Déterministe d'abord, jugement ensuite | Böckeler | S1 à S10 décident du vert ; les relecteurs IA donnent un avis | Le relecteur ne peut pas rendre vert ce que la moulinette refuse |
| Séparer celui qui produit de celui qui juge | Anthropic, harnais à trois agents (2026) | `security-reviewer`, `architecture-reviewer` en contexte neuf, lecture seule | Obligatoires dès le niveau 2 |
| Revue humaine selon un risque calculé sur le changement | Anthropic, revue de code de Claude Code (2026) | `verify/risk.ts`, niveaux 0 à 3 | La criticité des dépendances compte (un patch de `next-auth` = niveau 3) |
| L'approbation d'un agent ne vaut jamais celle d'un humain | Anthropic | `CODEOWNERS` sur les chemins de niveau 3 ; ADR « accepté » seulement par un humain | S5 refuse une rupture de contrat citant un ADR seulement « proposé » |
| Protéger les attentes : l'agent ne réécrit pas les tests pour passer | Paul Stack, *Why agent-written code needs product verification* (2026) | Test supprimé ou affaibli = niveau 3 ; tests de contrat comme condition de livraison | Les 220 tests d'API rejouent le contrat, jamais modifiés par l'agent sans validation |
| Mesurer ce que les tests attrapent | Böckeler (mutation dans le pipeline) | Stryker la nuit, seuil 95 % ; fuzzing du contrat | Le chiffre montré : régressions injectées détectées |
| Une tâche, un fichier, des critères vérifiables, un plan écrit avant le code | Backlog.md ; GitHub Spec Kit | `docs/tickets/`, skill `write-ticket`, preuves dans `docs/evidence/` | S10 refuse un ticket « done » sans preuve |
| Boucle de pilotage : un problème qui revient améliore un guide ou un capteur | Böckeler | Chaque hook et chaque règle de `risk.ts` est né d'une erreur réelle (notée dans le code) | Les répétitions du live coding alimentent la boucle (`docs/rehearsals.md`) |

## Les capteurs, du plus rapide au plus lent

| Moment | Capteur | Calculé ou inféré | Durée |
| --- | --- | --- | --- |
| Pendant l'édition | `npm run verify -- --level fast` (S1 à S10 sans les plus lents) | calculé | ~15 s |
| Avant chaque commit | Hook Git (fast, tous les clients) ; hook Claude Code (pr) | calculé | ~30 s |
| Avant de livrer | `npm run risk` ; relecteur en contexte neuf dès le niveau 2 | calculé, puis inféré | ~2 s + 2 min |
| Sur la PR | Même moulinette, tests unitaires, base réelle, 220 tests d'API, image de production, dependency review, SonarQube | calculé | ~6 min |
| La nuit | Mutation (Stryker), fuzzing du contrat (Schemathesis), secrets dans tout l'historique | calculé | ~15 min |
| Chaque semaine | OpenSSF Scorecard, Renovate | calculé | — |

L'agent lance la même moulinette que la CI avant de commiter : la CI confirme, elle ne découvre pas. On évite ainsi la
suite de commits qui se corrigent les uns les autres au rythme des retours de la CI.

## Peu d'outils, bien réglés

Dix contrôles regroupant quatorze outils (tsc, ESLint, dependency-cruiser, gitleaks, knip, jscpd,
Redocly, Spectral, oasdiff, Semgrep, hadolint, npm audit, OSV-Scanner, zizmor), chacun rattaché à un risque nommé (`verify/checks/*.ts`, champ `risk`), avec des seuils
en cliquet qui ne font que se resserrer (`verify/config.json`). On préfère un outil réglé et bloquant à trois outils
informatifs qu'on finit par ignorer.

## Références

- [Harness Engineering](https://martinfowler.com/articles/harness-engineering.html), Birgitta Böckeler, avril 2026
- [Harness engineering](https://openai.com/index/harness-engineering/), OpenAI, et le résumé
  [InfoQ](https://www.infoq.com/news/2026/02/openai-harness-engineering-codex), février 2026
- [Le harnais à trois agents d'Anthropic](https://infoq.com/news/2026/04/anthropic-three-agent-harness-ai/), InfoQ, avril 2026
- [Solving code review at Anthropic](https://claude.dev/blog/solving-code-review-at-anthropic/), 2026
- [Why agent-written code needs product verification](https://stack72.dev/why-agent-written-code-needs-product-verification/), Paul Stack
- [Backlog.md](https://github.com/MrLesk/Backlog.md), [Spec Kit](https://github.com/github/spec-kit)
