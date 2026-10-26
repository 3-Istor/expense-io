---
name: write-ticket
description: Écrire un ticket dans docs/tickets (travail à faire plus tard, problème vu hors périmètre pendant une session, constat d'audit), puis le clore avec sa preuve rangée dans docs/evidence.
---

# Écrire et clore un ticket

## Quand en écrire un

- Pendant une session, un problème **hors du périmètre de la tâche** (faille, bug, dette, doc fausse) : on ne le corrige
  pas dans le diff en cours (le niveau de risque et la relecture ne le couvriraient pas). On écrit un ticket et on
  le signale en une ligne à l'humain.
- Une décision attend quelqu'un (profs, humain) : ticket `blocked` qui dit quelle question.
- Un constat d'audit ou de relecteur qu'on ne traite pas tout de suite.

Pas de ticket pour ce qu'on fait dans la minute : on le fait.

## Écrire

1. Numéro suivant : le plus grand `T-NNNN` de `docs/tickets/` plus un. Fichier `docs/tickets/T-NNNN-<sujet-court>.md`.
2. En-tête YAML complet (format dans `docs/tickets/README.md`) : `id`, `title`, `status: todo`, `risk` (niveau
   attendu, `AGENTS.md`), `source` (`session` si vu pendant une tâche), `created`, `links`.
3. **Contexte** : le constat et sa preuve (fichier:ligne, sortie d'outil, test). **Critères d'acceptation** : des cases
   `- [ ]` vérifiables par une commande ou un test, jamais « c'est mieux ».
4. Ajouter la ligne dans l'index de `docs/tickets/README.md`.
5. `npm run verify -- --level fast` : S10 vérifie le format.

## Prendre un ticket

Passer `status: doing`, écrire le **Plan** dans le ticket avant le code (validé par un humain dès le niveau 2), puis
suivre le skill `add-feature` ou `contract-change`.

## Clore

1. Moulinette verte (`npm run verify -- --level pr`), tests verts.
2. `scripts/evidence.sh T-NNNN` (ajouter `--with-api` si le comportement HTTP a changé) : la preuve est rangée dans
   `docs/evidence/T-NNNN/`, datée, avec le commit.
3. Cocher les critères **un par un**, chacun justifié par la preuve. Un critère non tenu reste décoché : le ticket reste
   `doing`, ou devient `blocked` avec la raison.
4. `status: done`, mettre à jour l'index. S10 refuse un « done » sans preuve ou avec une case vide.
