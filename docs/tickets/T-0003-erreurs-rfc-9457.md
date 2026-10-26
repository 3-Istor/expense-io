---
id: T-0003
title: Erreurs au format RFC 9457 (Problem Details)
status: doing
risk: 2
source: prof
created: 2026-10-26
links: [Q4, A2]
---

## Contexte

Bonne pratique du cours 3, mise de côté pour ne pas casser les clients. Brian a validé l'alignement le 26 octobre ;
la question A2 est posée aux profs le soir même. La forme compatible garde `error` comme membre d'extension.

## Critères d'acceptation

- [x] Toutes les erreurs 4xx et 5xx : `type`, `title`, `status` (égal au code HTTP), `detail`, et `error` conservé.
- [x] Les 500 gardent `stack` vide et `errorId`.
- [x] Contrat : oasdiff classe le changement (ajout, 0 rupture) ; version 1.1.0 et changelog (skill `contract-change`).
- [x] Les tests d'API passent, plus 6 tests d'API et 4 tests unitaires sur le format.
- [ ] Fusion après la réponse des profs à A2.

## Plan

Négociation de contenu (ADR 0005) : RFC 9457 sur `Accept: application/problem+json`, format historique sinon.
Aucun client existant ne voit de différence ; le contrat passe en 1.1.0 (ajout). PR séparée, fusionnée après A2.

## Notes
