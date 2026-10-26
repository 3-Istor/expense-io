---
id: T-0007
title: OCR asynchrone (file adossée à Postgres)
status: todo
risk: 2
source: audit
created: 2026-10-26
links: [SEC-11, cours 2 phase 3]
---

## Contexte

L'OCR est borné (10 Mo, 15 s, 2 en parallèle) : suffisant aujourd'hui. Déclencheur : le temps de réponse de
`receipt-suggestion` dépasse le SLO (`docs/slo.md`). Nouvelle route à côté de l'ancienne : ajout, version mineure.

## Critères d'acceptation

- [ ] 202 Accepted avec un lien de suivi ; l'ancienne route synchrone reste.
- [ ] Retries bornés, file des échecs (DLQ), idempotence par clé.

## Plan

## Notes
