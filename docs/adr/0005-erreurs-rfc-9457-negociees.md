# 0005 — Erreurs au format RFC 9457, servies par négociation de contenu

- Statut : accepté (2026-10-26, Brian : alignement sur la RFC 9457 validé), fusion après la réponse des profs à A2
- Niveau de risque : 2 (contrat, ajout compatible : version 1.1.0)

## Contexte

Le cours 3 recommande la RFC 9457 (Problem Details) : `type`, `title`, `status`, `detail`, en
`application/problem+json`. On l'avait mise de côté (tâche 3.5) parce que les clients existants, dont les tests cachés
du jury, attendent peut-être le corps `{ error }` à l'identique : nos propres tests de caractérisation vérifient que
la clé `error` est la seule présente. Changer le corps ou le `Content-Type` par défaut serait une rupture (oasdiff :
`response-media-type-removed`).

## Décision

Une erreur a deux représentations, choisies par l'en-tête `Accept` (négociation de contenu HTTP) :

- `Accept: application/problem+json` : corps RFC 9457, `status` égal au code HTTP, `type` stable
  (`urn:expense-io:problem:<type>`), `error` gardé en membre d'extension ; pour une 500, `errorId` et `stack` (vide).
- Toute autre requête : `{ error }` en `application/json`, à l'identique.

Les codes HTTP ne changent pas (401/403 restent ceux du contrat gelé).

## Conséquences

- Contrat 1.1.0 : oasdiff classe le changement en ajout (`response-media-type-added`), 0 rupture.
- Un nouveau client (ou un agent IA) peut s'appuyer sur `type` ; aucun client existant ne voit de différence.
- Passer la RFC 9457 en format par défaut serait une version 2.0.0 : à décider avec un plan de dépréciation
  (`Deprecation`, `Sunset`), pas avant que les clients aient migré.

## Alternatives écartées

- **RFC 9457 par défaut** : la bonne pratique stricte, mais une rupture pour tout client du format actuel.
- **Champs RFC ajoutés au corps `{ error }` en `application/json`** : casse les clients qui vérifient les clés
  exactes, et reste non conforme (le type de média compte, cf. quiz RFC 9457 du cours 3, question 4).
