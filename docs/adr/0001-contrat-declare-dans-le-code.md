# 0001 — Le contrat d'API est déclaré dans le code, l'OpenAPI en est généré

- Statut : accepté (2026-10-20), mis en œuvre le 2026-10-20 (tâche 3.6)
- Niveau de risque : 2

## Contexte

Le cours recommande le « contract first ». L'OpenAPI Initiative recommande le design-first. Mais un fichier OpenAPI
écrit à côté du code peut diverger de l'implémentation, surtout quand un agent modifie le code. La codebase existe
déjà et n'a aucun contrat écrit.

## Décision

Design-first dans le processus, code-first dans le stockage. Chaque endpoint déclare ses entrées et sorties avec des
schémas Zod ; l'OpenAPI est généré et commité. Pour toute feature qui touche l'API, le premier commit ne contient que
le schéma et le diff de l'OpenAPI, relu par un humain avant l'implémentation.
En phase 1, `docs/openapi.yaml` est écrit à la main pour décrire l'existant ; il sert de référence pour vérifier que
la version générée en phase 3 est identique.

## Options écartées

- OpenAPI écrit à la main en permanence : deux sources de vérité, dérive probable.
- Pas d'OpenAPI, seulement des tests : pas de détection automatique des ruptures, pas de documentation.

## Conséquences

Contrôles S7 de la moulinette : spec à jour (régénération + `git diff`), spec valide (Redocly), conventions (Spectral),
rétrocompatibilité (oasdiff), version cohérente avec le type de changement, réponses réelles conformes au schéma.

## Mise en œuvre (tâche 3.6)

- Source : `src/contract/schemas.ts` (Zod 4) et `src/contract/operations.ts` (les 14 opérations).
- Génération : `npm run contract:generate` (`scripts/generate-openapi.ts`, @asteasolutions/zod-to-openapi) écrit
  `docs/openapi.yaml`. Le contrôle S5 de la moulinette échoue si le fichier commité diffère du fichier généré.
- Liaison au code : la sortie JSON des routes est typée par les schémas (`ExpenseNoteJson`, `UserJson`) ; un écart de
  forme casse la compilation.
- Équivalence vérifiée : comparaison résolue de la spec écrite à la main (phase 1) et de la spec générée, sur
  87 éléments (opérations, codes, schémas de réponse, paramètres), sans différence ; le comparateur détecte une
  mutation volontaire (8 différences).
- Reste à faire : diff de rétrocompatibilité entre versions (oasdiff) en CI.
