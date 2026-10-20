# Politique de faux positifs

Toute suppression d'un constat d'outil est justifiée, datée, et vérifiée par la CI (contrôle S10).

## Où l'écrire

| Outil | Fichier ou syntaxe | Champs obligatoires |
| --- | --- | --- |
| Trivy | `.trivyignore.yaml` | `id`, `statement` (raison), `expired_at` |
| Semgrep | `// nosemgrep: <règle> -- <raison> (expire AAAA-MM-JJ)` | règle, raison, expiration |
| gitleaks | `.gitleaksignore` + commentaire au-dessus | empreinte, raison, expiration |
| Dépendances | déclaration VEX (`not_affected` + justification) | produit, vulnérabilité, justification |

## Tri d'un constat

1. **Vrai positif** : corriger, ajouter le test qui le prouve.
2. **Faux positif prouvé**, seulement avec une preuve concrète parmi :
   code inatteignable ; entrée non contrôlée par un attaquant ; protection déjà en place (citer le test qui la démontre) ;
   fichier hors production (tests, scripts).
3. **Incertain** : ne jamais supprimer. Écrire dans `docs/plan/QUESTIONS.md` : le constat, les preuves, ce qu'il faudrait
   pour trancher. Le constat reste visible.

Toujours un humain pour supprimer un constat de gravité critique ou élevée, ou situé dans l'authentification ou
l'isolation entre entreprises.
