---
id: T-0001
title: "SEC-13 : rendre la clé de reçu imprévisible"
status: todo
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

- [ ] Les nouvelles clés sont `receipts/<uuid v4><extension>` : préfixe et extension inchangés.
- [ ] Les notes existantes gardent leur clé et leur reçu reste lisible (`receipt-url` répond 200).
- [ ] `receiptKey` garde son type (chaîne) : oasdiff ne signale aucune rupture ; seule la description change (patch).
- [ ] Un test unitaire prouve que deux notes consécutives ont des clés sans lien entre elles.
- [ ] Un test d'API crée une note et vérifie le motif de la clé ; la suite de contrat reste verte.
- [ ] SEC-13 passe à « corrigé » dans `docs/security/findings.md` ; `src/contract/schemas.ts` ne parle plus de faille.

## Plan

1. Domaine : `receiptKeyFor(id, mimeType)` prend un identifiant fourni par l'application (le domaine reste sans
   `node:crypto`, règle S2) ; l'application le génère avec `randomUUID()`.
2. `reserveReceiptSeq` n'est plus appelé à la création ; la colonne `receipt_seq` reste (aucune migration destructive).
3. Description de `receiptKey` mise à jour → contrat 1.1.1 (patch) et entrée au changelog.
4. Tests : unitaires (`tests/unit/expense-notes-use-cases.test.ts`, motif au lieu de `receipts/7.png`), API, matrice.

Niveau 2 : relecteur `security-reviewer` avant fusion.

## Notes

Un UUID réduit la devinabilité ; il ne remplace pas le contrôle d'accès, qui reste la vraie protection (SEC-03).
