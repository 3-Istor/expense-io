---
id: T-0001
title: "SEC-13 : rendre la clé de reçu imprévisible"
status: doing
risk: 2
source: audit
created: 2026-10-26
links: [SEC-13, Q7, "coaching 2026-10-26"]
---

## Contexte

La clé S3 d'un reçu est séquentielle (`receipts/42.png`) : elle révèle le volume et se devine. Le reçu reste protégé par
le contrôle d'accès (SEC-03 corrigée) et l'URL est signée 5 minutes. Corriger change la valeur du champ `receiptKey`
pour les nouvelles notes, pas son type.

Débloqué par le coaching du 2026-10-26 (réponse à Q7) : ne pas casser le contrat ; une valeur différente du même type,
avec les anciennes clés toujours lisibles, est acceptable (« il y a des manières de faire du double »).

## Critères d'acceptation

- [x] Les nouveaux fichiers sont stockés sous `receipts/<uuid v4><extension>` (colonne `storage_key`).
- [x] `receiptKey` garde son format d'origine (`receipts/<n>.<ext>`) : la suite de contrat reste verte sans modification.
- [x] Les notes existantes (sans `storage_key`) gardent leur reçu lisible (`receipt-url` répond 200).
- [x] oasdiff ne signale aucune rupture ; seule la description de `receiptKey` change (patch 1.1.1, changelog).
- [x] Un test prouve que deux notes consécutives ont des clés de stockage sans lien (unitaire et API).
- [x] SEC-13 passe à « corrigé » dans `docs/security/findings.md`.

## Plan

Changement de conception en cours de route : remplacer la valeur de `receiptKey` par un UUID cassait notre propre test
de caractérisation (`receipts/\d+.png`), donc probablement les tests cachés des profs. La clé exposée (`receiptKey`) et
la clé de stockage sont séparées : c'est la coexistence suggérée par le coach, sans toucher au contrat.

1. Migration 0005 : colonne `storage_key` (nullable, aucune donnée réécrite).
2. Domaine : `storageKeyFor(id, mime)` et `storedAt(note)` (clé opaque, sinon `receiptKey`) ; l'UUID vient de
   l'application (`newId`), le domaine reste pur (S2).
3. URL signée calculée sur `storedAt(note)` ; `noteJson` n'expose pas `storage_key`.

## Notes

Livré le 2026-10-27. Un UUID réduit la devinabilité ; il ne remplace pas le contrôle d'accès, qui reste la vraie
protection (SEC-03). Preuve : `docs/evidence/T-0001/`.
