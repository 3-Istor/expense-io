# Objectifs de service (SLO)

Vocabulaire (cours 4) : un **SLI** est une mesure (ex. part des requêtes réussies), un **SLO** l'objectif interne
sur cette mesure, un **SLA** l'engagement contractuel envers un client, avec pénalités. Expense.io n'a pas de SLA
(projet pédagogique) ; les SLO ci-dessous guident les priorités de l'équipe.

## Source des mesures

Deux sources, qui disent la même chose sous deux formes :

- **`GET /metrics`** (T-0021), au format Prometheus, pour les tableaux de bord et les alertes (détail plus bas). Route
  d'exploitation, hors du contrat client (`docs/openapi.yaml`), comme `/api/auth`.
- **Les journaux** : chaque appel d'API écrit une ligne JSON sur la sortie standard (`src/shared/http.ts`), pour
  comprendre un incident requête par requête :

```json
{"time":"2026-10-21T03:12:29.086Z","level":"info","msg":"requête API","requestId":"3f0c…","operation":"listMyExpenseNotes","status":200,"durationMs":11}
```

`operation` reprend l'`operationId` du contrat (`docs/openapi.yaml`). Un collecteur de journaux (Loki, CloudWatch…)
suffit pour calculer les SLI.

## SLO (fenêtre glissante de 28 jours)

| SLI | Mesure | SLO | Budget d'erreur |
| --- | --- | --- | --- |
| Disponibilité | requêtes API avec `status` < 500 / toutes les requêtes API | **99,5 %** | 0,5 % ≈ 3 h 20 sur 28 jours |
| Latence courante | p95 de `durationMs`, toutes opérations sauf `suggestFromReceipt` | **< 500 ms** | 5 % des requêtes au-dessus |
| Latence des décisions | p99 de `durationMs` pour `*ApproveNote`, `*RejectNote` | **< 1 s** | 1 % au-dessus |
| Suggestion par OCR | p95 de `durationMs` pour `suggestFromReceipt` | **< 15 s** | borné par le délai de l'OCR (SEC-11) |

Les erreurs 4xx (refus, entrée invalide) ne consomment pas le budget : ce sont des réponses correctes du service.

## SLI métier (T-0015)

Les SLI ci-dessus disent que l'API répond ; ils ne disent pas qu'une note avance. Exemple réel trouvé à l'audit : la
note d'un employé sans manager était acceptée (201, aucune erreur) puis restait en attente pour toujours (T-0014).

| SLI | Mesure | SLO | Source |
| --- | --- | --- | --- |
| Décision dans les délais | notes décidées en 5 jours ou moins ÷ notes **soumises** (fenêtre de 28 jours, notes de plus de 5 jours) | **90 %** (proposé, à valider par le produit) | base, `npm run metrics:business` |
| Plus vieille note en attente | âge de la plus ancienne note `pending`, par entreprise | alerte au-delà de 10 jours | base, `npm run metrics:business` |

Le dénominateur est le nombre de notes soumises, pas décidées : une note perdue fait baisser le SLI au lieu de
disparaître du calcul (cours 4, « Un SLI métier »). Les événements `note.submitted` et `note.decided` (délai en
secondes) sont aussi écrits dans les journaux, pour suivre la même chose dans un collecteur.

Chaque ligne de journal écrite pendant un appel d'API porte un `requestId` généré par le serveur : on retrouve toutes
les lignes d'une requête, erreur comprise, avec un seul filtre. L'en-tête `x-request-id` d'un appelant, s'il est sûr,
est journalisé à part (`clientRequestId`).

## Métriques Prometheus (`GET /metrics`, T-0021)

Trois standards connus plutôt qu'une liste de métriques au hasard. Ensemble, ils couvrent les quatre golden signals du
SRE Book (latence, trafic, erreurs, saturation).

| Standard | Question | Métriques |
| --- | --- | --- |
| RED (côté service) | Combien d'appels, combien d'erreurs, en combien de temps ? | `http_requests_total{operation,status}`, `http_request_duration_seconds{operation}` (histogramme) |
| USE (côté ressources) | Les ressources partagées sont-elles saturées ? | `db_pool_connections{state}` (total, idle, waiting), `ocr_jobs{state}` (running, waiting), `process_resident_memory_bytes` |
| Métier | Les notes avancent-elles ? Les fonctionnalités servent-elles ? | `expense_notes_submitted_total`, `expense_notes_decided_total{decision,approver}`, `expense_note_decision_delay_seconds` |

Labels bornés : `operationId` du contrat, code HTTP, décision, type de valideur. Jamais d'identifiant d'utilisateur, de
note ou d'entreprise (cardinalité, et aucune donnée de client dans les métriques). Compteurs en mémoire, par instance.
Accès : avec `METRICS_TOKEN`, `Authorization: Bearer <jeton>` ; sans jeton, ouvert en développement et en test, fermé
(401) en production. Les compteurs additionnent l'activité de toutes les entreprises : ils ne doivent pas être lisibles
depuis Internet.

Requêtes PromQL de référence :

```promql
# Disponibilité (SLI) : part des appels sans erreur 5xx
sum(rate(http_requests_total{status!~"5.."}[5m])) / sum(rate(http_requests_total[5m]))
# p95 de latence par opération
histogram_quantile(0.95, sum by (le, operation) (rate(http_request_duration_seconds_bucket[5m])))
# Saturation : connexions PostgreSQL en attente, tâches d'OCR en file
db_pool_connections{state="waiting"}
ocr_jobs{state="waiting"}
# Usage d'une fonctionnalité : suggestions OCR demandées par note soumise (proche de 0 = fonctionnalité peu utilisée)
sum(increase(http_requests_total{operation="suggestFromReceipt"}[7d])) / sum(increase(expense_notes_submitted_total[7d]))
# Délai de décision : part des notes décidées en 5 jours ou moins
sum(rate(expense_note_decision_delay_seconds_bucket{le="432000"}[1d])) / sum(rate(expense_note_decision_delay_seconds_count[1d]))
```

Alertes proposées (sur des symptômes, pas des causes ; cours 4) :

| Alerte | Condition | Action |
| --- | --- | --- |
| `ErrorRateTooHigh` | 5xx > 5 % pendant 5 min | page de l'astreinte |
| `P99LatencyTooHigh` | p99 hors OCR > 500 ms pendant 5 min | ticket le jour même |
| `OcrSaturated` | `ocr_jobs{state="waiting"}` > 0 pendant 10 min | revoir la piste asynchrone (T-0007) |
| `OldestPendingNote` | plus vieille note en attente > 10 jours (`npm run metrics:business`) | prévenir le RH de l'entreprise |

## Calcul (exemple avec jq sur un fichier de journaux)

```bash
# Disponibilité
jq -s '[.[] | select(.msg == "requête API")] | (map(select(.status < 500)) | length) / length' app.log
# p95 de latence, hors OCR
jq -s '[.[] | select(.msg == "requête API" and .operation != "suggestFromReceipt") | .durationMs] | sort
       | .[(length * 0.95 | floor)]' app.log
```

## Politique du budget d'erreur

- Budget consommé à plus de 50 % en milieu de fenêtre : la revue de PR priorise les correctifs de fiabilité.
- Budget épuisé : gel des nouvelles fonctionnalités jusqu'au retour sous l'objectif ; post-mortem sans recherche
  de coupable pour chaque incident qui a consommé plus de 10 % du budget.

## Limites assumées

- Pas de mesure de bout en bout côté navigateur, et pas de traçage distribué (monolithe, choix assumé).
- Le comptage repose sur les journaux de l'app : une panne complète (aucune ligne) se détecte par la sonde
  du conteneur (`HEALTHCHECK` sur `/login`) et doit compter comme indisponibilité dans l'outil de supervision.
