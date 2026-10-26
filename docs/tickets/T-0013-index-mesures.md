---
id: T-0013
title: Index SQL décidés par la mesure
status: todo
risk: 2
source: review
created: 2026-10-26
links: [cours 2 phase 1]
---

## Contexte

Les listes (notes de l'employé, du manager, du RH) filtrent par utilisateur, manager ou entreprise, sous RLS. Aucun
index n'a été ajouté ni mesuré. Règle : un index n'entre que si un plan d'exécution prouve son gain sur un volume réaliste.

## Critères d'acceptation

- [ ] Jeu de données de mesure (au moins 50 entreprises, 100 000 notes) généré par script.
- [ ] `EXPLAIN (ANALYZE, BUFFERS)` des 4 listes, avant et après chaque index candidat, rangé dans `docs/evidence/T-0013/`.
- [ ] Seuls les index au gain mesuré sont gardés ; les autres sont écartés par écrit.

## Plan

## Notes
