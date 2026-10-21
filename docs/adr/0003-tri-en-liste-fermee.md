# 0003 — Paramètre `sort` en liste fermée (400 sinon)

Date : 2026-10-20 · Statut : **rejeté** le 2026-10-21 par Brian : le contrat d'API ne change pas (voir « Décision finale »)

## Contexte

`GET /api/expense-notes?sort=` recopiait la valeur reçue dans `ORDER BY` : injection SQL (SEC-01, CWE-89, test T14).
Une valeur invalide donnait un 500 avec le message SQL. Le contrat ne prévoyait pas de 400 pour cette route.
L'UI n'utilise pas `sort`.

## Décision

Seules les valeurs `<colonne>` ou `<colonne> ASC|DESC` sont acceptées, sans tenir compte de la casse, pour les
colonnes `created_at`, `amount`, `expense_date`, `status` et `description`. Chacune correspond à une requête constante,
et la valeur reçue n'entre jamais dans le SQL. Toute autre valeur reçoit `400 {error}`, avant tout accès à la base.

## Conséquences

- Les tris légitimes de l'ancien comportement (`amount DESC`, etc.) marchent toujours.
- Un tri sur plusieurs colonnes ou une expression SQL donnait 200 ou 500 ; il donne maintenant 400.
- Alternative écartée : ignorer silencieusement un tri invalide (200 avec le tri par défaut). Elle évite un ADR mais
  masque l'erreur au client et ne correspond pas au « refus avant la base » du document de vision.

## Décision finale (2026-10-21)

Rejeté : aucun code d'erreur n'est ajouté au contrat. La faille reste corrigée avec un comportement déjà prévu :
un tri hors liste est **ignoré** (tri par défaut, 200) ; la valeur reçue n'entre jamais dans le SQL (tests T14 et
contrat, dont une division par zéro injectée qui n'est jamais exécutée).
