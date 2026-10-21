# 0005 — Validation finance après la validation hiérarchique

- Statut : **proposé** (répétition 3 du live coding : l'agent s'arrête ici, en attente d'un humain)
- Date : 2026-10-21
- Niveau de risque : 3 (nouveau rôle : contrôle d'accès, RLS) et 2 (contrat)

## Contexte

Demande : « après la validation par le manager (ou le RH), la finance valide le remboursement ». Aujourd'hui, une note
validée est finale (`approved`). Deux éléments du contrat sont gelés et devraient changer :

- l'enum `status` (`pending`, `approved`, `rejected`) ; une étape finance demande un état de plus ;
- l'enum `role` des utilisateurs (`employee`, `manager`, `hr_admin`) ; il faut un rôle `finance`.

`AGENTS.md` : changer une valeur d'enum exige un ADR validé par un humain. Brian a décidé (2026-10-21) que le contrat ne
change pas sans réponse des profs (questions-profs.md, Q6).

## Décision proposée

Option A (recommandée si les profs autorisent l'ajout d'un statut) : nouveau statut `paid`, nouveau rôle `finance` ;
`POST /api/finance/expense-notes/{id}/pay` (`approved` → `paid`) ; la finance voit les notes `approved` de SON entreprise ;
politiques RLS ajoutées pour ce rôle ; trace `decided_by` / `decided_at` réutilisée (`paid_by`, `paid_at`).

Option B (contrat strictement gelé) : aucun nouvel état ; la validation finance vit dans une table séparée
(`expense_note_payments`) exposée par de nouvelles routes seulement ; `status` reste `approved`. Plus de code, mais
aucun client existant ne voit de valeur inconnue.

## Conséquences

- A : tout client qui suppose trois statuts peut casser (le front actuel, la moulinette des profs).
- B : deux sources de vérité pour « où en est la note » ; à documenter.
- Les deux : nouveau rôle dans la contrainte `users.role`, nouvelles politiques RLS, tests d'isolation à deux entreprises
  pour la finance ; niveau 3, plan validé par un humain avant le code.

## Plan (si validé, 5 étapes)

1. Contrat : opérations finance dans `src/contract/` (et la valeur `paid` pour A), validé par un humain.
2. Migration : rôle `finance` dans la contrainte, politiques RLS finance (SELECT `approved`, UPDATE vers `paid`), réversible.
3. Domaine : transition `approved → paid` dans la machine à états, acteur ≠ auteur.
4. Tests d'abord : refus sans le rôle, isolation entre entreprises, double paiement (409), puis le cas nominal.
5. Relecteur sécurité, moulinette verte, PR.
