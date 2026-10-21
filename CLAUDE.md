@AGENTS.md

## Spécifique à Claude Code

- Commencer en plan mode pour toute tâche de niveau 2 ou 3.
- Utiliser un subagent pour lire beaucoup de fichiers ; garder le contexte principal pour l'implémentation.
- Lire `verify-summary.md` plutôt que les sorties brutes des outils ; n'ouvrir le détail que d'un contrôle en échec.
- Entre deux tâches sans rapport : `/clear`.
