# 0001 — Le contrat d'API est déclaré dans le code, l'OpenAPI en est généré

- Statut : accepté (2026-10-20), mise en œuvre en phase 3
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
