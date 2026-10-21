# Stratégie de test : comment savoir qu'on a « assez » de tests

Réponse courte : on ne compte pas les tests, on **mesure ce qu'ils attrapent**, avec des outils reconnus et
déterministes, chacun répondant à une question différente.

| Question | Outil (référence) | Résultat | Commande |
| --- | --- | --- | --- |
| Chaque route refuse-t-elle chaque profil non autorisé ? | Matrice d'autorisations générée (Playwright) | 14 routes × 7 profils = 98 cases, toutes vertes ; une route ajoutée au contrat sans sa ligne fait échouer la suite | `npx playwright test authz-matrix` |
| Le contrat est-il respecté, code par code ? | Suite de contrat (Playwright + Zod) | Chaque code documenté dans `docs/openapi.yaml` est exercé au moins une fois (dernier test de la suite) | `npx playwright test contract` |
| Les tests détectent-ils une régression de logique ? | Test de mutation, **Stryker** | **98,35 %** de mutants tués sur le domaine et les cas d'usage (seuil bloquant 95 %, nightly) | `npm run test:mutation` |
| Quelle part du code serveur est réellement exécutée par les tests d'API ? | Couverture V8 du vrai serveur (`NODE_V8_COVERAGE` + monocart) | Serveur : **95,1 %** des lignes, 91,1 % des fonctions, 61,8 % des branches | `npm run test:coverage:api` |
| Que se passe-t-il avec des entrées que personne n'a imaginées ? | Fuzzing du contrat, **Schemathesis** | Voir plus bas : 10+ erreurs 500 trouvées et corrigées | `npm run test:fuzz` |
| A-t-on cassé un comportement de l'application d'origine ? | Comparaison différentielle (suite de contrat de la phase 1 rejouée sur le code actuel) | Voir plus bas | voir § Différentiel |

## Pourquoi ces quatre mesures se complètent

- **La couverture** dit quel code est *exécuté*, pas s'il est *vérifié* : un test sans assertion couvre 100 %.
- **La mutation** comble ce trou : Stryker modifie le code (un `>` devient `>=`, un `if` devient `true`) et vérifie
  qu'au moins un test échoue. Un mutant qui survit = un comportement que personne ne vérifie.
- **La matrice** rend l'oubli impossible pour l'autorisation : les cas ne sont pas choisis à la main, ils sont
  le produit cartésien routes × profils.
- **Le fuzzing** sort des cas « raisonnables » : identifiants mal formés, dates impossibles, montants énormes,
  corps illisibles, méthodes non déclarées.

## Preuves que les tests attrapent vraiment les failles

Expériences faites en cassant volontairement le code (puis en le restaurant) :

| Code cassé | Résultat |
| --- | --- |
| Contrôle de rôle retiré d'une route manager | 12 tests de la matrice échouent |
| Filtre « même entreprise » retiré du dépôt RH | 0 échec : la politique RLS de PostgreSQL bloque encore. La **défense en profondeur** est prouvée, pas supposée |
| `checkReceipt` remis avec `in` (ancienne version) | Le test « noms hérités du prototype » échoue |

## Mutants survivants (6), tous équivalents

Un mutant équivalent ne change pas le comportement observable, donc aucun test ne peut le tuer : tableaux de
`TRANSITIONS` vidés là où une autre règle refuse déjà la transition, et tests `typeof` redondants avec la validation
Zod en amont. Liste à jour dans le rapport Stryker (`reports/mutation/`).

## Fuzzing : ce que Schemathesis a trouvé

Chaque cause a été corrigée dans le domaine ou l'adaptateur HTTP, avec un test unitaire ou d'API qui la fige :

| Entrée générée | Avant | Après | Où |
| --- | --- | --- | --- |
| Identifiant de note ou d'utilisateur qui n'est pas un UUID | 500 (erreur PostgreSQL) | 404, sans requête en base | `src/shared/ids.ts`, cas d'usage |
| Corps multipart illisible | 500 | 400 | `readForm` dans `src/shared/http.ts` |
| Date impossible (`2026-02-31`) | 500 | 400 | `isCalendarDate` (domaine) |
| Montant hors des bornes de la colonne `numeric` | 500 | 400 | `MAX_AMOUNT` (domaine) |
| Type de reçu `toString` / `constructor` | accepté (prototype) | 400 | `checkReceipt` (domaine) |

La spécification OpenAPI a été **précisée** pour décrire ce que l'app acceptait déjà (format de date) : mêmes routes, mêmes champs, mêmes codes, donc contrat inchangé.

Un constat n'a **pas** été corrigé, volontairement : le montant est lu avec `parseFloat` depuis l'origine (« 8* »
vaut 8). Le refuser changerait un succès en erreur, donc le contrat : question posée aux profs (Q10).

Exceptions assumées, chacune avec raison, preuve et date d'expiration : `docs/security/false-positives.md`
(FP-FUZZ-01 à 04).

## Différentiel avec l'application d'origine

_À compléter (étape 5) : suite de contrat de la phase 1 (commit 6ca7cd9) rejouée contre le code actuel ; chaque
différence doit correspondre à un correctif de sécurité documenté (SEC-xx) ou à une décision humaine._

## Trous connus

- **Interface** : 19,4 % des lignes de l'UI exécutées, aucun test navigateur. Le risque principal est côté API,
  qui est couverte ; des tests Playwright navigateur seraient la prochaine étape.
- **Branches serveur** : 61,8 %, surtout des chemins d'erreur d'infrastructure (S3 indisponible, OCR en échec).
- **Inscription** : le chemin d'inscription de `pg-user-repository.ts` n'est couvert que par le test d'intégration.
