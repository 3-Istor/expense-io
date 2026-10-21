# Questions pour un humain

Format : date, tâche, question, options, option prudente retenue en attendant, réversible ou non.
Un humain répond sous la question et coche la case.

## Ouvertes

- [ ] 2026-10-20 — Renovate : l'application GitHub Renovate doit être installée sur l'organisation 3-Istor
      par un admin pour que `renovate.json` soit pris en compte. En attendant : rien ne tourne. Réversible.
- [ ] 2026-10-20 — Protection de `main` sur le fork : à activer par un admin (merge par PR, CI verte obligatoire).
      En attendant : l'agent ne pousse que sur des branches `phase-N/...` et `harness/...`. Réversible.
- [ ] 2026-10-20 — À poser aux profs : codes 401/403 attendus tels quels ? `receiptKey` retirable ? nouvelle valeur
      de `status` acceptable ? sens de « root » ? comment la moulinette s'authentifie ? attentes Sonar et kube ?
      En attendant : contrat gelé à l'identique. Réversible.
- [ ] 2026-10-20 — Tâche 1.4 : la numérotation T01–T18 de la task A n'était pas dans le dépôt. Seules les
      références du doc de vision (T07, T11 à T18) ont été reprises telles quelles ; T01–T06 et T08–T10 ont été
      reconstruites à partir des règles du cours (`docs/audit/avant/authz.md`). À rapprocher de la restitution de la
      task A. En attendant : numérotation de `authz.md`. Réversible (renommer des tests).
- [ ] 2026-10-20 — Tâche 1.4 : l'employé sans manager (T08). Ses notes ne sont proposées à personne aujourd'hui.
      Options : (a) le RH les valide, comme pour un manager racine ; (b) on interdit l'état « sans manager » pour un
      employé ; (c) on garde tel quel. En attendant : (c), figé par T08 comme comportement actuel, sans le
      déclarer correct. Réversible. Lié à la question aux profs sur le sens de « root ».
- [ ] 2026-10-20 — Tâche 1.4 : les 11 échecs attendus ont été posés sans relecture humaine du plan (niveau 3,
      Brian a délégué en autonomie). Les tests n'ajoutent aucun code à l'app : à relire au point de contrôle de
      fin de phase 1. Réversible.
- [ ] 2026-10-20 — Tâche 1.6 (CI, niveau 3) : plan à valider avant d'écrire le workflow. Proposition :
      `.github/workflows/ci.yml` sur chaque PR vers `main` (Postgres 16 et LocalStack en services, migration,
      `npm run verify -- --level pr`, `npm test`, `npm run test:api`, gitleaks et OSV-Scanner par leurs actions
      officielles, Semgrep avec les règles maison + `p/typescript`) ; `nightly.yml` planifié chaque nuit, squelette.
      Permissions minimales (`contents: read`), actions épinglées par SHA, aucun secret requis.
      Point d'attention : pousser un workflow demande que le jeton Git de l'agent ait le droit `workflow`.
      En attendant : tâche mise de côté, 1.7 faite avant. Réversible.
- [ ] 2026-10-20 — Moulinette : le contrôle S5 (contrat OpenAPI) a été ajouté à `verify/` pendant la tâche 1.5,
      en autonomie. Toucher à `verify/` est de niveau 3 : à relire au point de contrôle de fin de phase 1.
      Proposition à valider : un contrôle S6 (Semgrep, règles maison) au niveau `pr`. Réversible.
