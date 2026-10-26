---
id: T-0010
title: Bloquer le trafic sortant inconnu des runners CI
status: todo
risk: 3
source: review
created: 2026-10-26
links: [docs/security/supply-chain.md]
---

## Contexte

`harden-runner` est en mode audit : il journalise les connexions sortantes. Après une semaine de runs, la liste des
destinations légitimes est connue ; le mode blocage coupe l'exfiltration (ChainDrop envoyait les jetons vers un
domaine de l'attaquant).

## Critères d'acceptation

- [ ] Liste des destinations par job, relevée sur les rapports harden-runner.
- [ ] `egress-policy: block` avec cette liste ; CI verte.

## Plan

## Notes
