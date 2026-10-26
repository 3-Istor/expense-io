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

- [ ] Toutes les erreurs 4xx et 5xx : `type`, `title`, `status` (égal au code HTTP), `detail`, et `error` conservé.
- [ ] Les 500 gardent `stack` vide et `errorId`.
- [ ] Contrat : oasdiff classe le changement ; version et changelog suivent (skill `contract-change`).
- [ ] Les 220 tests d'API passent, plus des tests sur le format.

## Plan

PR séparée, fusionnée seulement après la réponse à A2.

## Notes
