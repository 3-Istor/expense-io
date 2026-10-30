---
id: T-0026
title: "npm run risk ignore le contenu des fichiers pas encore suivis par git"
status: done
risk: 3
source: session
created: 2026-10-30
links: [S8, "répétition 4"]
---

## Contexte

Vu pendant la répétition 4 du live coding : une nouvelle migration RLS, pas encore ajoutée à git, n'apparaissait pas
dans les raisons de niveau 3 de `npm run risk` (ni de S8, qui l'appelle). Les fichiers non suivis étaient comptés avec
un contenu vide, donc les règles qui lisent le contenu (RLS, droits, dépendances) ne les voyaient pas.

## Critères d'acceptation

- [x] Le contenu d'un fichier non suivi est lu et traité comme ajouté (`newFileLines`, `verify/risk.ts`).
- [x] Fichier illisible, binaire ou de plus de 512 Ko : aucune ligne, sans erreur (le chemin reste classé).
- [x] Tests unitaires ; vérification manuelle : une migration non suivie avec `CREATE POLICY` sort en niveau 3.
