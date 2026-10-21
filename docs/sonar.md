# SonarQube en local, sans compte

1. `make sonar-up` démarre SonarQube Community (Docker) sur http://localhost:9000. Premier démarrage : 1 à 2 min.
2. Se connecter avec `admin` / `admin` (le mot de passe est à changer au premier login : c'est un compte local,
   pas un compte en ligne).
3. *My Account → Security → Generate Token* : un jeton de type « Global Analysis ».
4. `SONAR_TOKEN=<jeton> make sonar` : lance les tests avec couverture (`coverage/lcov.info`), puis l'analyse.
5. Résultats sur http://localhost:9000/dashboard?id=expense-io.

La configuration est dans `sonar-project.properties` : sources (`src`), tests, exclusions et couverture. Elle sert
aussi si les profs analysent le dépôt avec leur propre SonarQube.

Option : SonarQube Cloud (compte gratuit, connexion GitHub) commenterait chaque PR. Il faudrait ajouter le jeton dans
les secrets du dépôt. Non fait : la version locale suffit.
