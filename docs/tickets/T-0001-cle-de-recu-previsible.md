---
id: T-0001
title: "SEC-13 : rendre la clé de reçu imprévisible"
status: blocked
risk: 2
source: audit
created: 2026-10-26
links: [SEC-13, Q7]
---

## Contexte

La clé S3 d'un reçu est séquentielle (`receipts/42.png`) : elle révèle le volume et se devine. Le reçu reste protégé par
le contrôle d'accès (SEC-03 corrigée) et l'URL est signée 5 minutes. Corriger change la valeur du champ `receiptKey`.

Bloqué par : question Q7 aux profs (`docs/plan/questions-profs.md`).

## Critères d'acceptation

- [ ] Les nouvelles clés sont des UUID v4 ; les anciennes restent lisibles.
- [ ] `receiptKey` garde son type (chaîne) : oasdiff ne signale aucune rupture.
- [ ] Un test prouve que deux notes consécutives n'ont pas de clés devinables.

## Plan

À écrire quand Q7 est tranchée.

## Notes
