# Politique de faux positifs

Toute suppression d'un constat d'outil est justifiée, datée, et vérifiée par la CI (contrôle S10).

## Où l'écrire

| Outil | Fichier ou syntaxe | Champs obligatoires |
| --- | --- | --- |
| Trivy | `.trivyignore.yaml` | `id`, `statement` (raison), `expired_at` |
| Semgrep | `// nosemgrep: <règle> -- <raison> (expire AAAA-MM-JJ)` | règle, raison, expiration |
| gitleaks | `.gitleaksignore` + commentaire au-dessus | empreinte, raison, expiration |
| Dépendances | déclaration VEX (`not_affected` + justification) | produit, vulnérabilité, justification |

## Tri d'un constat

1. **Vrai positif** : corriger, ajouter le test qui le prouve.
2. **Faux positif prouvé**, seulement avec une preuve concrète parmi :
   code inatteignable ; entrée non contrôlée par un attaquant ; protection déjà en place (citer le test qui la démontre) ;
   fichier hors production (tests, scripts).
3. **Incertain** : ne jamais supprimer. Écrire dans `docs/plan/QUESTIONS.md` : le constat, les preuves, ce qu'il faudrait
   pour trancher. Le constat reste visible.

Toujours un humain pour supprimer un constat de gravité critique ou élevée, ou situé dans l'authentification ou
l'isolation entre entreprises.

## Registre des exceptions du fuzzing (Schemathesis, `schemathesis.toml`)

Constats de gravité faible, hors authentification et isolation ; chacun garde une preuve exécutable.

| Id | Constat | Tri et raison | Preuve | Expire |
| --- | --- | --- | --- | --- |
| FP-FUZZ-01 | `TRACE` sur toute route → 500 | Risque accepté, hors de notre code : Next.js 16 refuse la méthode en construisant la requête (`'TRACE' HTTP method is unsupported`), avant le proxy et les routes. Corps générique « Internal Server Error », rien n'est exécuté ni renvoyé (pas de cross-site tracing). Correctif à sa place : refuser TRACE au reverse proxy en production. | `curl -i -X TRACE /api/hr/users` sur `next start` (2026-10-21) : 500, 21 octets, aucun log métier | 2027-04-30 |
| FP-FUZZ-02 | `receipt-suggestion` accepte une partie `receipt` qui n'est pas une image (renvoie `{}`) | Faux positif : l'opération est une aide « au mieux », le contrat documente une suggestion « éventuellement vide ». Rejeter (400) changerait un succès en erreur : interdit sans ADR. | `tests/api/contract.spec.ts`, « 200 : suggestion avec au plus amount et expenseDate » (un PDF non lisible par l'OCR donne 200) ; sans fichier du tout, « 400 sans fichier » reste vrai | 2027-04-30 |
| FP-FUZZ-03 | 405 sans en-tête `Allow` (RFC 9110) | Limite du framework : Next.js génère lui-même le 405 des méthodes non exportées. Le refus est bien là ; seul l'en-tête manque. Ajouter 14 × 4 handlers pour un en-tête serait du bruit. | `tests/api/methods.spec.ts` : chaque méthode non déclarée de chaque route → 405 | 2027-04-30 |
| FP-FUZZ-04 | Création de note : requête conforme à la spec refusée par 400 (montant quelconque, type de reçu hors liste) | Faux positif : la spec ne fixe ni le format du montant (l'existant lit avec `parseFloat`, question Q10) ni, en machine, le type du reçu (décrit en texte : un `encoding` empêche Schemathesis de générer les fichiers). Refuser un montant vide, nul, négatif ou trop grand, ou un type hors png, jpeg, webp, pdf, est le comportement documenté (400). | `tests/api/contract.spec.ts`, « 400 : champ manquant ou montant invalide » ; tests du domaine sur les bornes | 2027-04-30 |
