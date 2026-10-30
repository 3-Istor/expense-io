# Changelog du contrat d'API

Une section par version de `docs/openapi.yaml` (`src/contract/version.ts`), la plus récente en haut. La moulinette (S5)
compare le contrat à `main` avec oasdiff et refuse une version qui ne suit pas le changement :

| Changement (détecté par oasdiff) | Version | Exige |
| --- | --- | --- |
| Rupture : champ ou route retiré, code changé, valeur d'enum retirée ou renommée, champ rendu obligatoire | majeure | ADR accepté par un humain, cité ici ; plan de dépréciation (`Deprecation`, `Sunset`) |
| Ajout compatible : route, champ de réponse, paramètre facultatif, valeur ajoutée à un enum de réponse (ADR 0006) | mineure | section ici |
| Texte seulement (descriptions, exemples) | patch | section ici |

Un tag `contract-vX.Y.Z` est posé automatiquement à la fusion dans `main` (`.github/workflows/contract-tag.yml`).

## 1.2.0 — 2026-10-30

Ajout (mineure, ADR 0006) :

- nouvelle valeur `reimbursed` dans `ExpenseNoteStatus` : une note validée que le RH a marquée remboursée.
  **Clients qui font un `switch` exhaustif sur `status`** : prévoir le cas, ou traiter une valeur inconnue comme
  « autre » (règle de `docs/contract.md`). Les notes existantes ne changent pas de statut.
- nouvelle route `POST /api/hr/expense-notes/{id}/reimburse` (`hrReimburseNote`), réservée à `hr_admin` : 200 et la
  note `reimbursed` ; 403 sans session ou autre rôle ; 404 note inconnue, d'une autre entreprise, du RH lui-même, ou
  pas validée (en attente, rejetée : le RH ne les voit pas) ; 409 note déjà remboursée.

Aucune route existante, aucun champ, aucun code HTTP existant ne change.

## 1.1.2 — 2026-10-27

Texte seulement : les descriptions des routes RH disent « auteurs sans manager de l'entreprise » au lieu de « managers
racine ». Comportement (T-0014, règle fonctionnelle validée au coaching) : le RH voit et décide désormais les notes de
tout auteur sans manager de son entreprise, employé, manager ou autre RH, jamais les siennes. Aucune route, aucun champ,
aucun code HTTP ne change ; l'`operationId` `listRootManagerPendingNotes` garde son nom. Pour un client RH : la liste
peut contenir plus de notes qu'avant ; une note qu'il recevait déjà y reste.

## 1.1.1 — 2026-10-27

Texte seulement : la description de `receiptKey` ne parle plus de faille. Le champ ne change ni de type ni de format
(`receipts/<n>.<ext>`) : c'est la référence promise aux clients. Le fichier, lui, est désormais stocké sous une clé
opaque (UUID) que l'API n'expose pas (SEC-13, T-0001) ; les notes existantes gardent leur fichier où il est.

## 1.1.0 — 2026-10-26

Ajout : les erreurs existent aussi au format RFC 9457 (`application/problem+json`), servi quand le client l'envoie
dans `Accept`. Sans cet en-tête, rien ne change (`{ error }` en `application/json`). Décision : ADR 0005.

## 1.0.0 — 2026-10-26

Publication du contrat comme engagement. Les 14 opérations, leurs champs et leurs codes de succès sont ceux de l'app
d'origine (`265924b`) ; les failles ont été fermées avec les codes existants (ADR 0002 et 0003 rejetés). Le format
`stack` des erreurs 500 est conservé, toujours vide, avec `errorId` en plus.

## 0.2.0 — 2026-10-20

Contrat déclaré dans le code (Zod), OpenAPI généré (ADR 0001). Version de travail, non publiée.
