# T-0026 — Preuve : le niveau de risque voit les fichiers non suivis

Date : 2026-10-30 · Niveau 3 (`verify/`) · Plan validé par Brian.

- Avant : une migration non suivie contenant `CREATE POLICY` était classée sur son chemin seul (contenu vide), la règle
  « RLS, rôles ou droits PostgreSQL » ne se déclenchait pas (répétition 4, `docs/rehearsals.md` sur la branche
  `rehearsal/remboursement`).
- Après, vérifié à la main sur une migration jetable non suivie :

```
Niveau de risque : 3 (base origin/main, 4 fichier(s))
- niveau 3 : RLS, rôles ou droits PostgreSQL (migrations/1700000000099_essai.sql)
```

- Tests unitaires (`tests/unit/risk.test.ts`) : le contenu d'une migration non suivie déclenche la règle RLS, le même
  fichier sans contenu ne la déclenchait pas ; fichier illisible, binaire ou trop gros : aucune ligne, sans erreur.
