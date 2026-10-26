---
id: T-0009
title: Monter les actions GitHub vers des versions Node 24
status: todo
risk: 3
source: session
created: 2026-10-26
links: ["PR #10"]
---

## Contexte

GitHub force Node 24 pour `actions/checkout` v4, `setup-node` v4, `setup-python` v5 et `upload-artifact` v4 (Node 20
déprécié) : avertissement à chaque run. Renovate ouvrira les PR (épinglées par empreinte, risque 3).

## Critères d'acceptation

- [ ] Plus d'avertissement Node 20 dans les runs ; actions toujours épinglées par SHA.

## Plan

## Notes
