# Chaîne d'approvisionnement : dépendances et CI

Une faille corrigée aujourd'hui ne suffit pas : la menace de 2026 vient des dépendances et de la CI elles-mêmes.
Le 4 août 2026, le ver ChainDrop a empoisonné 444 paquets npm en moins de quatre heures, par un script `preinstall`
qui vole les jetons npm, GitHub et cloud, et en publiant avec des attestations de provenance valides
([StepSecurity](https://stepsecurity.io/blog/chaindrop-npm-worm)). En mars 2026, les tags de `trivy-action` ont été
déplacés vers du code malveillant ([Wiz](https://www.wiz.io/blog/trivy-compromised-teampcp-supply-chain-attack)).
Ce document dit ce que le dépôt fait contre ça, et comment chaque mesure est vérifiée.

## Les mesures, et ce qui les vérifie

| Menace | Mesure | Vérifiée par |
| --- | --- | --- |
| Paquet piégé qui s'exécute à l'installation | `.npmrc` : `ignore-scripts=true` (l'app, les tests et le build fonctionnent sans) | `tests/unit/supply-chain.test.ts` |
| Version malveillante adoptée dans l'heure | Quarantaine de 7 jours : `min-release-age=7` (npm), `minimumReleaseAge` (Renovate) | même test (les deux valeurs doivent être égales) |
| Dépendance vulnérable ou malveillante connue | `npm audit` et OSV-Scanner (y compris les paquets malveillants `MAL-`), bloquants dès « élevée » | S9 de la moulinette, avant chaque commit |
| Paquet détourné (autre registre, empreinte absente) | Lockfile : registre officiel en HTTPS, empreinte sha512 obligatoire | S9 |
| Paquet altéré dans le registre | `npm audit signatures` (signatures et provenance) | CI |
| Nouvelle dépendance vulnérable dans une PR | `dependency-review-action`, bloquant dès « élevée » | CI de PR |
| Action GitHub dont le tag est déplacé | Toutes les actions épinglées par empreinte de commit ; Renovate les met à jour | zizmor (S9) |
| Workflow exploitable (injection, jeton trop large, identifiants persistés) | Permissions minimales, `persist-credentials: false` | zizmor (S9), OpenSSF Scorecard |
| Outil de contrôle piégé | `scripts/install-tools.sh` : versions épinglées, empreinte SHA-256 vérifiée | le script refuse un binaire différent |
| Exfiltration depuis un runner | `harden-runner` journalise chaque connexion sortante (mode audit, puis blocage) | rapport StepSecurity par job |
| Image de production vulnérable | OSV-Scanner sur l'image, SBOM CycloneDX archivé | CI, job `image` |
| Changement de ces règles par un agent | Tous ces fichiers sont de niveau de risque 3 et ont un propriétaire (`CODEOWNERS`) | `verify/risk.ts`, revue humaine |

La note globale est mesurée chaque semaine par [OpenSSF Scorecard](https://github.com/ossf/scorecard)
(`.github/workflows/scorecard.yml`).

## Mettre à jour : le type de version ne suffit pas

Semver dit ce qu'un changement casse pour celui qui l'utilise ; il ne dit pas ce qu'il coûte s'il est faux. Alex Gaynor
le résume avec la loi de Hyrum : tout comportement observable finit par être utilisé par quelqu'un, donc un patch
peut casser ([What's in a version number?](https://alexgaynor.net/2021/oct/07/whats-in-a-version-number/)). On décide
donc avec deux axes : le type de version et la criticité du paquet.

| | Outil de dev | Dépendance d'exécution ordinaire | Paquet critique |
| --- | --- | --- | --- |
| Patch ou mineure | Fusion automatique : CI verte, 7 jours d'âge (niveau 1) | Fusion automatique : CI verte, contrat inchangé, 7 jours (niveau 2) | Un humain relit les notes de version (niveau 3) |
| Majeure | Un humain (niveau 2) | Un humain (niveau 2) | Un humain valide le plan (niveau 3) |
| Correctif de sécurité | Sans attendre, même règle | Sans attendre, même règle | Sans attendre, niveau 3, priorité du jour |

Les paquets critiques et leur raison sont dans `verify/supply-chain.json`. La même liste pilote Renovate
(`renovate.json`) et le niveau de risque de l'agent (`verify/risk.ts`) : un test vérifie qu'elles sont identiques.

## À faire une fois dans les réglages GitHub (administrateur du dépôt)

Ces réglages ne vivent pas dans le code ; Scorecard signale ceux qui manquent.

- [ ] **Settings → Branches → main** : PR obligatoire, checks `verify`, `image` et `dependency-review` obligatoires,
      revue des Code Owners, pas de push forcé.
- [ ] **Settings → General** : « Allow auto-merge » (utilisé par Renovate pour les mises à jour sans risque).
- [ ] **Settings → Security** : Dependabot alerts, secret scanning et push protection, private vulnerability reporting.
- [ ] Ajouter un deuxième propriétaire dans `.github/CODEOWNERS` (deux humains au niveau 3).
- [ ] Vérifier que l'app Renovate a accès au dépôt et que le tableau de bord des dépendances s'ouvre.

## Références

- [OpenSSF Scorecard](https://github.com/ossf/scorecard) et le guide npm de l'OpenSSF
- [Renovate, minimum release age](https://docs.renovatebot.com/key-concepts/minimum-release-age/)
- [ChainDrop, StepSecurity](https://stepsecurity.io/blog/chaindrop-npm-worm)
- [Trivy compromis, Wiz](https://www.wiz.io/blog/trivy-compromised-teampcp-supply-chain-attack)
- [zizmor](https://docs.zizmor.sh/), [OSV-Scanner](https://google.github.io/osv-scanner/)
