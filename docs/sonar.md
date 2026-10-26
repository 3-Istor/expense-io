# SonarQube en local, sans compte

Une commande, aucune étape manuelle : `make sonar` (ou `npm run sonar`).

1. Le script `scripts/sonar.sh` démarre SonarQube Community (Docker, profil `sonar`) s'il ne répond pas.
2. Au premier lancement, il change le mot de passe `admin` de cette instance locale, crée le projet et le quality gate
   maison `expense-io`, puis un jeton d'analyse jetable (révoqué à la fin).
3. Il lance les tests avec couverture (`coverage/lcov.info`), puis le scanner dans son image Docker officielle.
4. Il échoue si le quality gate échoue. Résultats : http://localhost:9000/dashboard?id=expense-io.

## Le quality gate

Sur tout le code, pas seulement le nouveau : 0 bug, 0 vulnérabilité, 0 code smell, notes A en fiabilité, sécurité et
maintenabilité, duplication au plus 5 %.

## Où il tourne

- **Sur le poste, avant de pousser** : `make sonar` (Docker requis). Pour l'agent, c'est le contrôle à lancer quand
  la moulinette `nightly` ne suffit pas à trancher un constat de qualité.
- **En CI** : `.github/workflows/sonar.yml`, même script, même instance Community en conteneur de service.

Aucune donnée ne sort de la machine ou du runner : pas de SonarQube Cloud (décision de Brian, 2026-10-26).

La configuration est dans `sonar-project.properties` : sources (`src`), tests, exclusions et couverture. Elle sert
aussi si les profs analysent le dépôt avec leur propre SonarQube.
