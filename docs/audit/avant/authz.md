# Audit « avant » — matrice d'autorisations

Relevé le 2026-10-20 sur le code d'origine (`265924b`), par `tests/api/authz.spec.ts` (tâche 1.4).
Fixtures : deux entreprises A et B, chacune avec deux RH, deux managers racine, un employé par manager et un employé
sans manager. Chaque exécution crée ses propres entreprises.

Reproduire :

```bash
npm run test:api -- tests/api/authz.spec.ts                       # 21 passed : 10 garde-fous + 11 échecs attendus
AUTHZ_SHOW_FLAWS=1 npm run test:api -- tests/api/authz.spec.ts -g SEC-   # montre l'échec réel de chaque faille
```

## Règles respectées aujourd'hui (garde-fous, doivent rester verts)

| Scénario | Règle |
| --- | --- |
| T01 | Tout le monde peut créer une note (employé, employé sans manager, manager, RH) |
| T02 | On ne voit et ne lit que ses propres notes, y compris entre entreprises |
| T03 | Un manager ne voit que les notes en attente de ses subordonnés directs |
| T04 | Un manager décide des notes de ses subordonnés |
| T05 | Un manager ne décide pas des notes hors de son équipe (autre équipe, sans manager, autre manager, RH) |
| T06 | Un manager ne décide pas des notes d'une autre entreprise |
| T07 | Personne ne valide sa propre note ; un RH ne valide pas la note d'un autre RH |
| T08 | La note d'un employé sans manager n'est proposée à personne (comportement actuel, question ouverte) |
| T09 | Le RH voit et décide des notes des managers racine de son entreprise |
| T10 | Le RH ne voit ni ne modifie rien d'une autre entreprise (notes, reçus, annuaire, rattachement) |

## Failles (échecs attendus, marqués `test.fail`)

SEC-NN = correctif n° NN du document de vision. Chaque ligne donne l'échec réel observé (`AUTHZ_SHOW_FLAWS=1`).
Gravités et CWE indicatifs, à confirmer dans les fiches de la phase 2 (CVSS v4.0).

| Scénario | Réf. | Faille | CWE | Observé | Attendu |
| --- | --- | --- | --- | --- | --- |
| T11 | SEC-03 | Un manager obtient l'URL du reçu de n'importe quelle note, autre équipe et autre entreprise comprises | CWE-639 | 200 | 404 |
| T12 | SEC-04 | Le RH rattache un employé à un manager d'une autre entreprise | CWE-639 | 200 | 409 |
| T12b | SEC-14 | Cycle de managers accepté (A manage B, B manage A) | CWE-840 | 200 | 409 |
| T13 | SEC-09 | Un corps JSON illisible est lu comme `{managerId: null}` : le manager est détaché | CWE-20 | `manager_id` → `null` | 400, rattachement intact |
| T14 | SEC-01 | Injection SQL par `sort` (tri booléen sur une sous-requête arbitraire) | CWE-89 | 200 | 400 |
| T14b | SEC-07 | Une erreur 500 renvoie la stacktrace et le message PostgreSQL | CWE-209 | `{error: "invalid input syntax for type uuid…", stack}` | ni `stack` ni détail SQL |
| T15 | SEC-08 | Course : approve et reject simultanés réussissent tous les deux (100 paires, reproduit 3 fois sur 3) | CWE-362 | deux 200 | un 200, un 409 |
| T16 | SEC-05 | L'app se connecte avec un rôle superutilisateur : la RLS, même `FORCE`, ne s'applique pas | CWE-250 | `rolsuper: true` | ni superuser ni `BYPASSRLS` |
| T17 | SEC-05 | Aucune politique RLS des notes ne compare l'entreprise | CWE-284 | 8 politiques sans `company_id` | 0 |
| T18 | SEC-10 | Un manager rétrogradé en base garde ses droits tant que son JWT vit | CWE-613 | 200 | 401 |
| T18b | SEC-02 | `AUTH_SECRET` est en dur dans le dépôt : on forge une session RH d'une autre entreprise | CWE-798 | 200 | 403 |

## Autres constats relevés en écrivant les tests

- **Erreurs non rattrapées** : les routes qui font `return withUserScope(...)` sans `await` (liste des notes,
  décisions manager et RH, listes manager et RH) laissent échapper l'erreur au `try/catch`. Une erreur SQL y
  donne un 500 au corps vide, au lieu du `{error}` promis par le contrat, et elle n'est pas journalisée par
  `respondError`. Exemple : `GET /api/expense-notes?sort=colonne_inexistante` renvoie un 500 vide. À traiter avec SEC-07.
- **Mauvais commentaire, mauvaise hypothèse** : `src/app/api/manager/expense-notes/[id]/receipt-url/route.ts`
  suppose que l'UI a déjà filtré (« la note existe forcément dans la liste… »). C'est la cause de SEC-03.
  `AGENTS.md` l'interdit désormais : chaque route vérifie elle-même ses droits.
- **Employé sans manager** (T08) : ses notes ne sont proposées à personne et restent en attente pour toujours.
  Règle métier à trancher : voir `docs/plan/QUESTIONS.md`.

Hors de ces tests : la clé S3 prévisible (SEC-13), l'inscription par domaine (SEC-15), l'OCR non borné (SEC-11)
et la création de note non atomique (SEC-12) seront prouvés par leurs propres tests en phase 2.
