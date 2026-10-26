---
id: T-0002
title: "SEC-15 : inscription par domaine email sans vérification"
status: blocked
risk: 3
source: audit
created: 2026-10-26
links: [SEC-15, ADR 0004]
---

## Contexte

Le premier inscrit sur un domaine devient RH de tous les comptes de ce domaine (gmail.com compris). L'inscription passe
par une server action, hors du contrat d'API, mais les tests cachés créent peut-être leurs comptes par ce chemin.

Bloqué par : la question « comment la moulinette crée-t-elle ses comptes ? » (A4) et l'ADR 0004 (proposé).

## Critères d'acceptation

- [ ] Décision humaine sur l'ADR 0004 (accepter le risque pour la démo, ou invitations).
- [ ] Si invitations : lien à usage unique, lié à l'entreprise et à l'adresse, expiration, consommation atomique.
- [ ] Les comptes du seed et le parcours utilisé par les tests restent identiques.

## Plan

À écrire après la réponse des profs.

## Notes
