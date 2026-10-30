# T-0021 — Preuve : /metrics (RED, USE, métier)

Date : 2026-10-30 · Niveau calculé 3 (`.env.example` touché pour documenter `METRICS_TOKEN`), plan validé par Brian.

## Tests

- `tests/api/metrics.spec.ts` : après un appel de liste et une création de note, `/metrics` répond 200 en
  `text/plain`, les compteurs RED des deux opérations et `expense_notes_submitted_total` augmentent, l'histogramme de
  durée et les jauges USE sont présents, et la réponse ne contient aucun UUID ni le domaine de l'entreprise.
- `tests/unit/metrics.test.ts` : format d'exposition, seaux cumulés, somme et nombre, échappement des labels, jauge
  du limiteur d'OCR (running, waiting), accès avec et sans `METRICS_TOKEN`.
- Unitaires : Tests 117 passed (117). API : 233 passent (232 + le nouveau). Base : passe. Moulinette `pr` : verte.
- Contrat : `docs/openapi.yaml` inchangé (la route est hors contrat), S5 « contrat inchangé ».

## Extrait du format exposé (registre alimenté à la main, pour lecture)

```
# HELP http_requests_total Requêtes d'API terminées, par opération du contrat et code HTTP (RED : débit, erreurs)
# TYPE http_requests_total counter
http_requests_total{operation="createExpenseNote",status="201"} 1
http_requests_total{operation="listMyExpenseNotes",status="200"} 1
http_requests_total{operation="suggestFromReceipt",status="200"} 1
# HELP expense_notes_submitted_total Notes de frais soumises
# TYPE expense_notes_submitted_total counter
expense_notes_submitted_total 1
# HELP expense_notes_decided_total Notes de frais décidées, par décision et type de valideur
# TYPE expense_notes_decided_total counter
expense_notes_decided_total{decision="approved",approver="manager"} 1
# HELP http_request_duration_seconds Durée des requêtes d'API (RED : durée ; p95/p99 par histogram_quantile)
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{operation="createExpenseNote",le="0.05"} 0
http_request_duration_seconds_bucket{operation="createExpenseNote",le="0.1"} 1
http_request_duration_seconds_bucket{operation="createExpenseNote",le="0.25"} 1
http_request_duration_seconds_bucket{operation="createExpenseNote",le="0.5"} 1
http_request_duration_seconds_bucket{operation="createExpenseNote",le="1"} 1
http_request_duration_seconds_bucket{operation="createExpenseNote",le="2.5"} 1
http_request_duration_seconds_bucket{operation="createExpenseNote",le="5"} 1
http_request_duration_seconds_bucket{operation="createExpenseNote",le="10"} 1
http_request_duration_seconds_bucket{operation="createExpenseNote",le="15"} 1
http_request_duration_seconds_bucket{operation="createExpenseNote",le="30"} 1
http_request_duration_seconds_bucket{operation="createExpenseNote",le="+Inf"} 1
http_request_duration_seconds_sum{operation="createExpenseNote"} 0.084
http_request_duration_seconds_count{operation="createExpenseNote"} 1
http_request_duration_seconds_bucket{operation="listMyExpenseNotes",le="0.05"} 1
http_request_duration_seconds_bucket{operation="listMyExpenseNotes",le="0.1"} 1
http_request_duration_seconds_bucket{operation="listMyExpenseNotes",le="0.25"} 1
http_request_duration_seconds_bucket{operation="listMyExpenseNotes",le="0.5"} 1
http_request_duration_seconds_bucket{operation="listMyExpenseNotes",le="1"} 1
http_request_duration_seconds_bucket{operation="listMyExpenseNotes",le="2.5"} 1
http_request_duration_seconds_bucket{operation="listMyExpenseNotes",le="5"} 1
http_request_duration_seconds_bucket{operation="listMyExpenseNotes",le="10"} 1
http_request_duration_seconds_bucket{operation="listMyExpenseNotes",le="15"} 1
http_request_duration_seconds_bucket{operation="listMyExpenseNotes",le="30"} 1
http_request_duration_seconds_bucket{operation="listMyExpenseNotes",le="+Inf"} 1
http_request_duration_seconds_sum{operation="listMyExpenseNotes"} 0.012
http_request_duration_seconds_count{operation="listMyExpenseNotes"} 1
http_request_duration_seconds_bucket{operation="suggestFromReceipt",le="0.05"} 0
```
