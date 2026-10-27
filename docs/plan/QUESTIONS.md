# Questions pour un humain

Format : date, tâche, question, options, option prudente retenue en attendant, réversible ou non.
Un humain répond sous la question et coche la case. Questions pour les profs : `docs/plan/questions-profs.md`.

## Ouvertes

- [ ] 2026-10-20 — Numérotation T01–T18 : seules T07 et T11–T18 viennent du doc de vision ; T01–T06 et T08–T10 ont
      été reconstruites (`docs/audit/avant/authz.md`). À rapprocher de la restitution de la task A (question interne
      à l'équipe). Réversible (renommer des tests).
- [ ] 2026-10-20 — Relecture des tests « échec attendu » (`tests/api/authz.spec.ts`, T11 à T18) : écrits en
      autonomie. Un test « échec attendu » décrit le comportement CORRECT et échoue tant que la faille existe ; si
      l'attendu est faux, le correctif le sera aussi. À parcourir une fois (10 min) avant de merger la phase 1.
- [ ] 2026-10-21 — Montant laxiste, trouvé par le fuzzing (Schemathesis) : l'app lit le montant avec `parseFloat`
      depuis l'origine, donc « 8* » est accepté et vaut 8, « 12abc » vaut 12, « 1.999 » est arrondi par la base.
      Options : (a) garder tel quel ; (b) refuser tout montant qui n'est pas un décimal propre (400). (b) change un
      succès en erreur pour ces entrées, donc touche le contrat : question pour les profs
      (`questions-profs.md`, Q10). Option prudente retenue : (a), la spec décrit l'existant (pas de motif strict). Réversible.

## Fermées

- [x] 2026-10-26 — Employé sans manager (T08) : réponse du coaching, « c'est du fonctionnel, pas du contrat ».
      Ticket T-0014.

- [x] 2026-10-21 — Couverture du contrat en dernier test (pour lancer un seul test en live coding) : gardée (Brian).

- [x] 2026-10-21 — SEC-05 terminé : compte de connexion limité `expense_app_login` (migration 0004), administrateur
      réservé aux migrations et au seed (`DATABASE_ADMIN_URL`). Brian a autorisé la lecture de `.env.example`.
      **À faire une fois par chaque membre de l'équipe** : ajouter dans son `.env` les deux lignes `DATABASE_URL` et
      `DATABASE_ADMIN_URL` de `.env.example` (sinon l'app marche quand même, en administrateur).

- [x] 2026-10-21 — ADR 0002 et 0003 : rejetés par Brian, le contrat d'API ne change pas. Failles corrigées avec les
      codes existants (409 pour un corps illisible, tri hors liste ignoré). Question gardée pour les profs (Q3).
- [x] 2026-10-21 — `AUTH_SECRET` : l'app démarre sans configuration (secret aléatoire par processus), décision de Brian.

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
