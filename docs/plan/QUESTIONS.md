# Questions pour un humain

Format : date, tâche, question, options, option prudente retenue en attendant, réversible ou non.
Un humain répond sous la question et coche la case. Questions pour les profs : `docs/plan/questions-profs.md`.

## Ouvertes

- [ ] 2026-10-20 — SEC-05, fin du correctif : l'app se connecte à PostgreSQL avec le compte `expense`, qui est
      administrateur (superutilisateur) dans l'image Docker. Un administrateur ignore la RLS. Fait : chaque
      transaction métier bascule sur le rôle limité `expense_app` (`SET LOCAL ROLE`), donc la RLS s'applique aux
      routes. Reste : la connexion elle-même (connexion, inscription, et toute requête hors `withUserScope`) et le
      cas d'une injection SQL, qui pourrait revenir en administrateur (`RESET ROLE`). Correctif : un compte de
      connexion non administrateur dans `DATABASE_URL`, l'administrateur réservé aux migrations. Il faut modifier
      `.env.example` et `.env`, que l'agent n'a pas le droit de lire. Option proposée : autoriser l'agent à lire et
      modifier `.env.example` (valeurs de dev publiques, comme `docker-compose.yml`) ; un humain recopie la ligne
      dans son `.env`. En attendant : rôle endossé par transaction, T16 en échec attendu. Réversible.
- [ ] 2026-10-20 — ADR 0002 et ADR 0003 (statut « proposé ») : deux routes répondent maintenant 400 à une entrée
      invalide (corps illisible sur le rattachement de manager ; tri hors liste). Avant : détachement silencieux du
      manager, ou injection SQL / 500. Un nouveau code d'erreur est un changement de contrat : question posée aux
      profs (`questions-profs.md`, Q3). En attendant : appliqué sur la branche, réversible.
- [ ] 2026-10-20 — Employé sans manager (T08) : ses notes ne sont proposées à personne. Question posée aux profs
      (`questions-profs.md`, Q5). En attendant : comportement actuel figé par T08. Réversible.
- [ ] 2026-10-20 — Numérotation T01–T18 : seules T07 et T11–T18 viennent du doc de vision ; T01–T06 et T08–T10 ont
      été reconstruites (`docs/audit/avant/authz.md`). À rapprocher de la restitution de la task A (question interne
      à l'équipe). Réversible (renommer des tests).
- [ ] 2026-10-20 — Relecture des tests « échec attendu » (`tests/api/authz.spec.ts`, T11 à T18) : écrits en
      autonomie. Un test « échec attendu » décrit le comportement CORRECT et échoue tant que la faille existe ; si
      l'attendu est faux, le correctif le sera aussi. À parcourir une fois (10 min) avant de merger la phase 1.

## Fermées

- [x] 2026-10-20 — Tâche 3.5 (erreurs RFC 9457). Réponse de Brian : « on ne prend pas le risque, laisse tel quel ».
      Format d'erreur `{error}` conservé, commentaire dans `src/shared/http.ts`. Tâche abandonnée.
- [x] 2026-10-20 — Renovate : application installée sur le dépôt par Brian.
- [x] 2026-10-20 — Protection de `main` : non nécessaire (réponse de Brian).
- [x] 2026-10-20 — Tâche 1.6, droit `workflow` du jeton Git : GitHub exige ce droit pour POUSSER des fichiers
      `.github/workflows/`. Le push a fonctionné, la CI tourne (PR #1, #3, #4) : sans objet.
- [x] 2026-10-20 — Contrôles S5 (contrat) et S6 (Semgrep) ajoutés à la moulinette en autonomie : `AGENTS.md` classe
      toute modification de `verify/` en niveau 3 (relecture humaine), car un agent qui modifie ses propres
      contrôles pourrait les affaiblir. Ici, ils ne font qu'ajouter des contrôles et resserrer des seuils ; le
      diff est dans la PR #1 et la PR #3.
