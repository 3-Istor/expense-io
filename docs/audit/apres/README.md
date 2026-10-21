# Audit « après » — comparaison avec le code d'origine

Relevé le 2026-10-20 sur la branche `phase-3/architecture`, avec **le même script et les mêmes versions d'outils** que
l'audit « avant » : `scripts/audit.sh docs/audit/apres`. Sorties brutes, commandes et versions dans `raw/`.

| Mesure | Avant (`265924b`) | Après | Outil |
| --- | --- | --- | --- |
| Duplication | 17,4 % (385 lignes, 31 clones) | **4,3 %** (107 lignes, 10 clones) | jscpd 5.4.1 |
| Fichiers jamais importés | 7 (façade `domain`, `ports`, `adapters`, `utils`) | **0** | knip 6.42.1 |
| Exports inutilisés | 0 | **0** | knip |
| Constats de sécurité statiques | 17 | **0** | Semgrep 1.181.0, 8 règles maison* |
| Failles d'autorisation prouvées | 11 tests en échec attendu | **0** | Playwright |
| Tests d'API | 0 | **68** (contrat, autorisations, trace) | Playwright |
| Tests unitaires et d'intégration | 0 | **27 + 1** | Vitest |
| Règles d'architecture | aucune | **6 règles bloquantes, 0 violation** | dependency-cruiser |
| Contrat | écrit nulle part | **déclaré dans le code, OpenAPI généré et vérifié** | Zod, Redocly, Spectral |
| Dépendances vulnérables (prod) | 3 (1 critique) | 3 (1 critique), inchangé | npm audit |

\* Les 8 règles actuelles (6 au premier audit, plus 2 sur les routes exportées) donnent aussi 17 constats sur le
code d'origine : la comparaison se fait à règles égales.

Le total de lignes augmente (2 213 → 2 512) : modules, ports, adaptateurs et contrat déclaré en code remplacent du
code dupliqué et la façade inutilisée ; la duplication baisse en valeur absolue (385 → 107 lignes).

## Ce qui reste ouvert

- ~~SEC-05~~ : corrigé le 2026-10-21 (compte de connexion limité, T16 et T16b).
- **SEC-13** : clé S3 prévisible. Attend la réponse des profs sur `receiptKey`.
- **SEC-15** : inscription par domaine sans vérification. Gardée pour la démo (ADR 0004).
- **Dépendances** : `next` 16.3.5 (critique, `next/og` non utilisé), `sharp`, `source-map-js`. Montée de niveau 3
  proposée par Renovate une fois l'app installée.
- **Tâche 3.5** (erreurs RFC 9457) : mise de côté en attendant les profs.
- Non exécutés dans la session cloud (proxy) : gitleaks et OSV-Scanner. Ils tournent en CI : S3 (gitleaks) est vert
  sur la PR de la phase 2.
