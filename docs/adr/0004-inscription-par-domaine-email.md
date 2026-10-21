# 0004 — Inscription par domaine email : conservée pour la démo, risque documenté

Date : 2026-10-20 · Statut : **proposé** (écrit par l'agent en autonomie, à valider par un humain)

## Contexte

`signup` (`src/app/actions/auth.ts`) rattache un nouveau compte à l'entreprise de son domaine email, et le PREMIER
inscrit d'un domaine devient `hr_admin`. Aucune adresse n'est vérifiée (SEC-15). Conséquences :

- **Prise de contrôle d'une entreprise** : quiconque s'inscrit en premier avec `x@entreprise.com`, sans posséder
  cette boîte, devient RH. Tous les vrais salariés inscrits ensuite rejoignent son entreprise : il voit l'annuaire
  (noms, emails), rattache les managers et décide des notes des managers racine.
- **Domaines publics** : tous les comptes `@gmail.com` forment une seule « entreprise gmail », dont le premier
  inscrit est RH.
- **Usurpation** : s'inscrire avec l'adresse d'un collègue (non vérifiée) bloque ensuite son vrai compte (email unique).

CWE-287 (authentification incorrecte), OWASP API2:2023. Non corrigé en phase 2 : c'est le parcours de démo
(`make dev` crée tout sans étape manuelle), et un correctif change le parcours d'inscription.

## Décision

Garder le mécanisme pour la démo, et ne pas le présenter comme sûr. Correctif cible, par ordre de priorité :

1. Vérifier l'adresse email (lien signé) avant d'activer le compte.
2. Refuser les domaines publics (liste maintenue, ou `public-suffix` et une liste de fournisseurs).
3. Créer une entreprise par un parcours explicite (le premier RH est invité ou vérifié par un opérateur), puis
   inviter les salariés au lieu de les rattacher automatiquement.

## Conséquences

- Le risque est visible dans l'audit (`docs/security/findings.md`, SEC-15) et dans la soutenance.
- Les points 1 et 2 sont compatibles avec le contrat de l'API : `signup` est une server action, hors des 14 endpoints.
