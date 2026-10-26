# Changelog du contrat d'API

Une section par version de `docs/openapi.yaml` (`src/contract/version.ts`), la plus récente en haut. La moulinette (S5)
compare le contrat à `main` avec oasdiff et refuse une version qui ne suit pas le changement :

| Changement (détecté par oasdiff) | Version | Exige |
| --- | --- | --- |
| Rupture : champ ou route retiré, code changé, valeur d'enum renommée, champ rendu obligatoire | majeure | ADR accepté par un humain, cité ici ; plan de dépréciation (`Deprecation`, `Sunset`) |
| Ajout compatible : route, champ de réponse ou paramètre facultatif | mineure | section ici |
| Texte seulement (descriptions, exemples) | patch | section ici |

Un tag `contract-vX.Y.Z` est posé automatiquement à la fusion dans `main` (`.github/workflows/contract-tag.yml`).

## 1.1.0 — 2026-10-26

Ajout : les erreurs existent aussi au format RFC 9457 (`application/problem+json`), servi quand le client l'envoie
dans `Accept`. Sans cet en-tête, rien ne change (`{ error }` en `application/json`). Décision : ADR 0005.

## 1.0.0 — 2026-10-26

Publication du contrat comme engagement. Les 14 opérations, leurs champs et leurs codes de succès sont ceux de l'app
d'origine (`265924b`) ; les failles ont été fermées avec les codes existants (ADR 0002 et 0003 rejetés). Le format
`stack` des erreurs 500 est conservé, toujours vide, avec `errorId` en plus.

## 0.2.0 — 2026-10-20

Contrat déclaré dans le code (Zod), OpenAPI généré (ADR 0001). Version de travail, non publiée.
