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

- Niveau prévisible d'après `AGENTS.md` ; après coup, `npm run risk` donne le niveau réel (règles de `verify/risk.ts`).
- **Niveau 2 (contrat, nouvel endpoint, migration)** : écrire d'abord le diff du contrat dans `src/contract/` puis
  `npm run contract:generate`, montrer le diff de `docs/openapi.yaml`, et **attendre la validation humaine** avant le code.
  Le contrat existant est gelé : on ajoute, on ne change jamais un code, un champ ou une valeur d'enum existants.
- **Niveau 3 (auth, isolation, accès, RLS, CI, moulinette, harnais)** : écrire le plan en 5 lignes maximum et
  **attendre la validation humaine**.

## 3. Test d'abord (5 min)

- Un test qui échoue et qui exprime le critère : `tests/api/*.spec.ts` (comportement HTTP, autorisations) ou
  `tests/unit/*.test.ts` (domaine, cas d'usage avec faux adaptateurs).
- Toute nouvelle route : au moins un test d'accès refusé (sans session, mauvais rôle, autre entreprise).
- Le lancer et constater l'échec (`npx playwright test -g "<nom>"` ou `npx vitest run <fichier>`).

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
- Niveau 2 ou plus : lancer le relecteur `security-reviewer` (contexte neuf) sur le diff, et traiter ses constats.
- Commit (impératif, le pourquoi dans le corps), mise à jour de `docs/plan/PROGRESS.md`.
