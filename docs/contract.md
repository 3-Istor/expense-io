# Contrat actuel de l'API (gelé)

Relevé sur le commit `265924b`, confirmé par les tests de caractérisation `tests/api/contract.spec.ts` (tâche 1.3) :
codes HTTP et clés JSON exactes de chaque endpoint.
Version machine : `docs/openapi.yaml` (OpenAPI 3.1), **générée** depuis `src/contract` (ADR 0001) ; chaque réponse de ces
tests est validée contre elle.
Toutes les routes exigent une session Auth.js (cookie). En cas d'exception : `500 {error, errorId}`, message
générique (la stacktrace a été retirée en phase 2, SEC-07 ; le champ `error` est conservé).

| Méthode et chemin | Rôle | Entrée | Succès | Erreurs |
| --- | --- | --- | --- | --- |
| `GET /api/expense-notes` | connecté | query `sort` (facultatif ; hors liste : tri par défaut) | 200, notes de l'appelant | 401 |
| `POST /api/expense-notes` | connecté | multipart `amount`, `expenseDate`, `description`, `receipt` (png, jpg, webp, pdf, ≤ 10 Mo) | 201, la note | 400, 401 |
| `GET /api/expense-notes/{id}/receipt-url` | propriétaire | — | 200 `{url}` | 401, 404 |
| `POST /api/expense-notes/receipt-suggestion` | connecté | multipart `receipt` | 200 `{amount?, expenseDate?}` | 400, 401 |
| `GET /api/manager/expense-notes` | `manager` | — | 200, notes en attente des subordonnés | 401 |
| `POST /api/manager/expense-notes/{id}/approve` | `manager` | — | 200, la note | 401, 404, 409 |
| `POST /api/manager/expense-notes/{id}/reject` | `manager` | — | 200, la note | 401, 404, 409 |
| `GET /api/manager/expense-notes/{id}/receipt-url` | `manager` | — | 200 `{url}` | 401, 404 |
| `GET /api/hr/expense-notes` | `hr_admin` | — | 200, notes en attente des auteurs sans manager de l'entreprise (T-0014) | 403 |
| `POST /api/hr/expense-notes/{id}/approve` | `hr_admin` | — | 200, la note | 403, 404, 409 |
| `POST /api/hr/expense-notes/{id}/reject` | `hr_admin` | — | 200, la note | 403, 404, 409 |
| `GET /api/hr/expense-notes/{id}/receipt-url` | `hr_admin` | — | 200 `{url}` | 403, 404 |
| `GET /api/hr/users` | `hr_admin` | — | 200, employés et managers de l'entreprise | 403 |
| `PUT /api/hr/users/{id}/manager` | `hr_admin` | JSON `{managerId}`, uuid ou `null` | 200, l'utilisateur | 403, 404, 409 (manager invalide ou corps illisible) |

Formats :

- Note : `{id, userId, amount (nombre), expenseDate ("AAAA-MM-JJ"), description, receiptKey, status ("pending"|"approved"|"rejected"), createdAt (ISO 8601)}`
- Utilisateur : `{id, name, email, role, managerId}`
- Erreur 4xx : `{error: "message"}`

Connexion : Auth.js (`/api/auth/*`) et server actions de `src/app/actions/auth.ts` — à garder tels quels.

Règle : ajouter un champ ou durcir une validation est permis. Retirer un champ, changer un code HTTP ou retirer une
valeur d'enum exige un ADR validé par un humain (niveau de risque 2 au minimum).

Valeurs d'enum (ADR 0006) : ajouter une valeur à un enum de réponse (`status`, `role`) est un ajout, version mineure ;
un client doit tolérer une valeur qu'il ne connaît pas (la traiter comme « autre », pas planter). La nouvelle valeur est
annoncée dans `docs/contract-changelog.md`. Retirer ou renommer une valeur est une rupture : version majeure et ADR.
