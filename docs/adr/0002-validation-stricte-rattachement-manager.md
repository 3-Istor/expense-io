# 0002 — Corps du rattachement de manager validé strictement (400)

Date : 2026-10-20 · Statut : **rejeté** le 2026-10-21 par Brian : le contrat d'API ne change pas (voir « Décision finale »)

## Contexte

`PUT /api/hr/users/{id}/manager` lisait un corps illisible comme `{ managerId: null }` : une requête mal formée
détachait silencieusement l'employé de son manager (SEC-09, test T13). Le contrat ne prévoyait pas de 400 pour
cette route. `docs/contract.md` permet de durcir une validation, mais un nouveau code d'erreur demande un ADR.

## Décision

Le corps doit être un objet JSON avec la clé `managerId`, valant un UUID ou `null`. Sinon : `400 {error}`, et rien
n'est modifié. L'UI (`AdminConsole.tsx`) envoie déjà exactement cette forme.

## Conséquences

- Un client qui envoyait `{}` pour détacher reçoit maintenant 400 : il doit envoyer `{ "managerId": null }`.
  Aucun client de ce type connu (seule l'UI appelle la route).
- 400 ajouté à `docs/openapi.yaml` et `docs/contract.md`, couvert par un test de contrat.
- Alternative écartée : ignorer le corps invalide et renvoyer 200 sans rien changer (cache l'erreur au client).

## Décision finale (2026-10-21)

Rejeté : aucun code d'erreur n'est ajouté au contrat. La faille reste corrigée avec un comportement déjà prévu :
un corps illisible reçoit le **409 « Invalid manager »** existant, et rien n'est modifié (tests T13 et contrat).
