# T-0030 — preuves

- Repli testé avec un `pip` factice qui échoue toujours (« Read-only file system ») : venv créé, semgrep 1.181.0,
  hadolint 2.15.1, zizmor 1.31.1, schemathesis 4.32.0 liés dans le dossier cible et lancés par le script.
- Chemin normal relancé (`scripts/install-tools.sh ~/.local/bin`) : mêmes versions, aucun venv créé.
- Moulinette `pr` verte. `npm run risk` donne 1 (fichier .sh hors règles) ; monté à 3 à la main : chaîne
  d'approvisionnement des outils, demandé et validé par Brian.
- Non prouvé : exécution réelle sur NixOS (les binaires des wheels semgrep et hadolint peuvent demander nix-ld).
