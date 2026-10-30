---
id: T-0030
title: "make install sur NixOS : pip système en lecture seule"
status: done
risk: 3
source: human
created: 2026-10-30
---

## Contexte

Sur NixOS, le `pip` du PATH vient du store Nix (lecture seule) : `scripts/install-tools.sh` échouait, donc `make dev`.

## Critères d'acceptation

- [x] Si les deux `pip install` échouent, les outils Python s'installent dans un venv
  (`${XDG_DATA_HOME:-~/.local/share}/expense-io-tools`), mêmes versions épinglées, liés dans le dossier cible.
- [x] Chemin normal inchangé (le repli ne s'active qu'après les deux échecs).
