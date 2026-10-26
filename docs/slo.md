# Objectifs de service (SLO)

Vocabulaire (cours 4) : un **SLI** est une mesure (ex. part des requêtes réussies), un **SLO** l'objectif interne
sur cette mesure, un **SLA** l'engagement contractuel envers un client, avec pénalités. Expense.io n'a pas de SLA
(projet pédagogique) ; les SLO ci-dessous guident les priorités de l'équipe.

## Source des mesures

Aucun endpoint de métriques (contrat d'API gelé). Chaque appel d'API écrit une ligne JSON sur la sortie standard
(`src/shared/http.ts`) :

```json
{"time":"2026-10-21T03:12:29.086Z","level":"info","msg":"requête API","operation":"listMyExpenseNotes","status":200,"durationMs":11}
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
