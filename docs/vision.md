# Vision

Expense.io est un SaaS B2B multi-tenant jeune (quelques dizaines d'entreprises clientes, 3 à 5 développeurs).
Prochaines évolutions : validation finance, facturation, IA ; plus tard l'international.

**Message du projet** : l'IA écrit le code ; l'architecture et les garde-fous décident de ce qui passe.

## Cible

- Monolithe modulaire (`expense-notes`, `identity`), hexagonale légère : domaine, cas d'usage, ports, adaptateurs.
- Contrat d'API gelé, déclaré dans le code, vérifié en CI (ADR 0001).
- Isolation entre entreprises garantie deux fois : règles d'accès centrales dans le code, RLS PostgreSQL réelle.
- Run : Docker, health check, logs structurés, métriques, SLO, Kubernetes testé.

## Nos trois paris

1. **La moulinette** (`verify/`) : 23 contrôles statiques, dynamiques, interactifs et de déploiement, chacun lié à un risque.
2. **Une revue humaine pilotée par le risque** : quatre niveaux déterministes ; l'humain relit là où une erreur coûterait cher.
3. **Bonus** : un kit qui équipe n'importe quel projet d'un harnais (`equip-harness`).

## Ce qu'on sacrifie

Pas de microservices, un seul module refait à fond, interface retouchée au minimum, pas de traçage distribué.
