---
id: T-0021
title: "Métriques Prometheus : RED, USE et métier sur /metrics"
status: done
risk: 2
source: review
created: 2026-10-30
links: [T-0015, "cours 4 (TP métriques)", "docs/slo.md"]
---

## Contexte

Relecture de la slide observabilité par Brian : on avait des journaux structurés, des SLO et un SLI métier, mais pas
de métriques interrogeables. Le cours 4 demande « middleware RED + GET /metrics » et des métriques métier. Notre
argument pour ne pas exposer `/metrics` (« contrat gelé ») ne tenait pas : la route est une route d'exploitation, hors
du contrat client, comme `/api/auth`.

## Critères d'acceptation

- [x] `GET /metrics` au format Prometheus 0.0.4, hors de `docs/openapi.yaml` (contrat inchangé, oasdiff : rien).
- [x] RED par opération du contrat : `http_requests_total{operation,status}`, `http_request_duration_seconds` (histogramme).
- [x] USE : pool PostgreSQL (total, idle, waiting), OCR (running, waiting, plafond), mémoire du processus.
- [x] Métier : notes soumises, décidées (décision, type de valideur), délai de décision (histogramme).
- [x] Usage d'une fonctionnalité calculable (suggestion OCR ÷ notes soumises), requête dans `docs/slo.md`.
- [x] Labels bornés, aucun identifiant ni domaine d'entreprise (test d'API qui le vérifie).
- [x] `METRICS_TOKEN` : sans jeton, route ouverte en développement et en test seulement (relecture sécurité) ;
      comparaison en temps constant sur empreintes. Tests unitaires du format, des seaux, de l'échappement et de l'accès.

## Plan

Registre en mémoire sans dépendance (`src/lib/metrics.ts`), appelé par `handle()` et par un adaptateur
d'événements métier ; jauges lues au moment de la collecte. Niveau 2 : nouvelle route d'exploitation, relecteur
sécurité en contexte neuf.
