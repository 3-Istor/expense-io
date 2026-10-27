---
name: contract-change
description: Changer le contrat d'API d'Expense.io (champ, paramètre, route, code HTTP, valeur d'enum) - classer le changement en semver avec oasdiff, choisir la version, écrire le changelog et l'ADR si rupture, faire valider le diff du contrat avant le code.
---

# Changer le contrat d'API

Le contrat est une promesse faite à des clients qu'on ne connaît pas tous : les tests cachés du jury en sont un.
Une API publiée est une « one-way door » (cours 3). Ce skill s'applique dès qu'un fichier de `src/contract/` change.

## 1. Classer AVANT d'écrire (1 min)

| Le changement | Exemple | Type | Version |
| --- | --- | --- | --- |
| Retirer ou renommer un champ, une route, une valeur d'enum | `status: paid` au lieu de `approved` | rupture | majeure + ADR |
| Rendre obligatoire un champ facultatif, durcir une entrée acceptée | `reason` exigé au rejet | rupture | majeure + ADR |
| Changer un code HTTP existant, un `Content-Type` | 409 → 400 | rupture | majeure + ADR |
| Ajouter une valeur à un enum **de réponse** | `status: finance_pending` | ajout (ADR 0006, règle des profs) : S5 le classe ainsi ; prévenir dans le changelog les clients qui font un `switch` exhaustif | mineure |
| Ajouter une route, un champ de réponse ou un paramètre facultatif | `rejectionReason?` | ajout | mineure |
| Descriptions, exemples | texte d'une opération | patch | patch |

Dans le doute : on prend le type le plus fort. Annoncer le type et la version en une ligne, puis demander la
validation humaine (niveau 2 au moins ; niveau 3 si la rupture touche l'authentification ou l'isolation).

## 2. Chercher l'option compatible d'abord

Avant d'accepter une rupture, proposer une option qui l'évite, et la montrer à l'humain :

- un champ **facultatif** plutôt qu'obligatoire, avec une valeur par défaut côté serveur ;
- un **nouveau champ** (`step`) plutôt qu'une nouvelle valeur d'enum dans `status` ;
- une **nouvelle route** à côté de l'ancienne, l'ancienne marquée `deprecated` avec en-têtes `Deprecation` et `Sunset`.

## 3. Écrire le contrat, puis le prouver

1. Modifier `src/contract/schemas.ts` ou `operations.ts`.
2. Changer `src/contract/version.ts` selon le tableau.
3. `npm run contract:generate`.
4. Ajouter la section `## X.Y.Z — AAAA-MM-JJ` dans `docs/contract-changelog.md` (ce qui change, pour qui, quoi faire).
5. Rupture : écrire l'ADR (skill `write-adr`) et le citer dans la section (« ADR 00xx »).
6. `npm run verify -- --level fast` : S5 compare à `main` avec oasdiff. Il refuse une rupture sans majeure, un ajout
   sans mineure, une version sans section de changelog, une rupture sans ADR cité.
7. Montrer à l'humain le diff de `docs/openapi.yaml` et le verdict de S5, **avant d'écrire le code**.

## 4. Puis le code

Suivre le skill `add-feature` à partir de l'étape 3 (test d'abord). Mettre à jour `expectNote` dans
`tests/support/fixtures.ts` seulement après la validation du contrat.

## Ce que l'agent ne fait jamais

- Changer la version sans changer le contrat pour « faire passer » S5, ou l'inverse.
- Modifier `docs/openapi.yaml` à la main : il est généré.
- Toucher à `verify/lib/contract-version.ts` pour assouplir la règle (niveau 3, refusé sans humain).
