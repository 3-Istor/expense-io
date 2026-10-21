---
name: add-feature
description: Ajouter ou modifier une fonctionnalité d'Expense.io (live coding compris) en suivant le chemin piloté par le risque - critère testable, niveau annoncé, test d'abord, module hexagonal, moulinette verte, commit.
---

# Ajouter une fonctionnalité

À suivre dans l'ordre. Annoncer chaque étape en une ligne : l'humain suit le chrono.

## 1. Cadrer (2 min)

- Reformuler la demande en **un critère d'acceptation testable** (« un RH peut exporter… : `GET … ` renvoie 200 et un CSV
  avec ces colonnes »). Si deux lectures sont possibles, poser UNE question, puis continuer avec la plus prudente.
- Lister les fichiers que le changement va toucher.

## 2. Annoncer le niveau de risque (1 min)

- Annoncer le niveau **de la demande**, d'après le plan et `AGENTS.md`, avant le code. `npm run risk` classe le **diff**,
  donc après coup : un ADR seul est en niveau 0 alors que la demande peut être en niveau 3 (répétition 3).
- Sur une branche partie d'une autre que `main` : `RISK_BASE=<branche de départ> npm run risk`.
- Si `npm run risk` donne un niveau plus haut que prévu, c'est lui qui a raison : le dire et appliquer son point de
  contrôle (répétition 1 : un export « niveau 2 » touchait la requête de périmètre, donc niveau 3).
- **Niveau 2 (contrat, nouvel endpoint, migration)** : écrire d'abord le diff du contrat dans `src/contract/` puis
  `npm run contract:generate`, montrer le diff de `docs/openapi.yaml`, et **attendre la validation humaine** avant le code.
  Le contrat existant est gelé : on ajoute, on ne change jamais un code, un champ ou une valeur d'enum existants.
- **Niveau 3 (auth, isolation, accès, RLS, CI, moulinette, harnais)** : écrire le plan en 5 lignes maximum et
  **attendre la validation humaine**.

## 3. Test d'abord (5 min)

- Un test qui échoue et qui exprime le critère : `tests/api/*.spec.ts` (comportement HTTP, autorisations) ou
  `tests/unit/*.test.ts` (domaine, cas d'usage avec faux adaptateurs).
- Toute nouvelle route : au moins un test d'accès refusé (sans session, mauvais rôle, autre entreprise).
- Le lancer et constater l'échec (`npx playwright test -g "<nom>"` ou `npx vitest run <fichier>`). Les tests d'une
  nouvelle opération vont dans `tests/api/contract.spec.ts` : la couverture du contrat y est vérifiée.

## 4. Implémenter dans le module (10 min)

Ordre : domaine → cas d'usage → adaptateur → route mince.

- Domaine (`src/modules/<module>/domain/`) : TypeScript pur, aucune dépendance technique.
- Cas d'usage (`application/`) : ne parle qu'aux ports, lève `AppError` (`invalid`, `denied`, `not-found`, `conflict`).
- Adaptateur (`infrastructure/`) : toute requête dans `withUserScope` (RLS, isolation) ; SQL constant, jamais de
  valeur du client concaténée.
- Route (`src/app/api/.../route.ts`) : `handle('<operationId>', <401|403>, async () => { const me = await requireUser(); … })`.
- Contrat : déclarer l'opération dans `src/contract/operations.ts`, puis `npm run contract:generate`.

## 5. Vert (boucle, 3 essais maximum)

```bash
npm run verify -- --level pr && npm test && npm run test:api
```

Lire `verify-summary.md`, pas les sorties brutes. Après 3 essais rouges sur le même problème : s'arrêter, expliquer ce qui
bloque, proposer deux options. Ne jamais affaiblir un test ni un seuil pour passer au vert.

## 6. Relire et livrer

- `npm run risk` : coller le niveau et ses raisons dans le message de commit.
- Niveau 2 ou plus : **toujours** lancer le relecteur `security-reviewer` (contexte neuf) sur le diff, et traiter ses
  constats. Lors des répétitions, il a trouvé un vrai bug à chaque fois (injection CSV via « ; », contournement
  du plafond par `toString`) que les tests et la moulinette avaient laissé passer.
- Un ajout à une réponse existante (nouveau champ) est un changement de contrat : `expectNote` dans
  `tests/support/fixtures.ts` vérifie les clés exactes et le signalera ; le mettre à jour seulement après validation.
- Commit (impératif, le pourquoi dans le corps), mise à jour de `docs/plan/PROGRESS.md`.
