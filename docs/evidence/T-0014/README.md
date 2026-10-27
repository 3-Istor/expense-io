# T-0014 — Preuve : les notes d'un auteur sans manager reviennent au RH

Date : 2026-10-27 · Niveau 3 (accès, RLS) · Décision de Brian : « un root est un mec sans manager », tous rôles.

## Règle

`domain/approvers.ts` `mayDecide(valideur, auteur)` : manager direct s'il existe ; sinon un RH de la même entreprise ;
jamais l'auteur, jamais une autre entreprise. La même règle est écrite en SQL dans `SCOPE.hr` (dépôt) et dans la RLS
(migration 0006) ; le prédicat du domaine est la référence testée, il n'est pas appelé en production (le dépôt filtre).

## Tests

- Unitaires (`tests/unit/expense-notes-domain.test.ts`, 3 nouveaux) : auteur avec manager, sans manager (employé,
  manager racine, RH), soi-même, autre entreprise. Total : 112 passent.
- API (`tests/api/authz.spec.ts`) : T08 réécrit (employé sans manager → visible et validable par le RH, 200),
  T08b (note d'un RH → validable par un autre RH, 404 pour lui-même), T08c (RH d'une autre entreprise → 404 partout), T08d (employé avec manager → le RH ne voit rien, 404 sur reçu,
  validation et rejet).
  T07 garde « personne ne valide sa propre note ». Total : 232 passent (231 + T08d) ; matrice d'autorisations 14 × 7 inchangée.
- Base (`npm run test:db`) : passe.

## RLS testée directement (rôle `expense_app`, transaction annulée)

```
-- RH1 (A) : UPDATE sa propre note (attendu 0), la note de l orphelin (attendu 1)
rh1 -> sa note : 0
rh1 -> orphelin : 1
-- RH2 (A) : UPDATE la note de RH1 (attendu 1)
rh2 -> note rh1 : 1
-- RH (B) : SELECT puis UPDATE des notes de A (attendu 0, 0)
rh B voit : 0
rh B -> notes A : 0
```

## Contrat

Descriptions seulement : oasdiff classe en patch, 1.1.1 → 1.1.2 (S5). `operationId` inchangé.

## Relecture en contexte neuf (security-reviewer)

Rien de bloquant (aucune fuite entre entreprises, aucune auto-validation, vérifié aussi en base). Corrigé : `mayDecide`
compare l'entreprise dans les deux branches (test ajouté) ; test T08d ajouté. Ouvert : T-0020, un RH peut détacher un
employé de son manager puis valider sa note (décision de Brian attendue, question dans `docs/plan/QUESTIONS.md`).
