# Questions aux profs (équipe 3-Istor)

Chaque question : le contexte en deux lignes, la question, et ce qu'on fait en attendant.

## Contrat et moulinette

**Q1. Comment la moulinette lance-t-elle l'app et se connecte-t-elle ?**
Nous avons retiré le secret de session écrit en dur (n'importe qui pouvait forger une session). L'app marche quand
même sans configuration : sans `AUTH_SECRET`, elle génère un secret aléatoire au démarrage.
→ La moulinette utilise-t-elle `make dev`, un `.env` fourni, ou ses propres variables ? Avec quels comptes (ceux du
seed : `hr@expense.io`, `manager@expense.io`, `demo@expense.io`) ?
*En attendant : rien à configurer, ça démarre dans tous les cas.*

**Q2. Les codes 401 et 403 actuels sont-ils attendus tels quels ?**
Aujourd'hui, un rôle insuffisant reçoit 401 sur les routes manager, mais 403 sur les routes RH (l'usage standard est
401 sans session, 403 sans le bon rôle).
→ Doit-on garder ces codes à l'identique ?
*En attendant : gardés à l'identique.*

**Q3. Un code d'erreur plus précis serait-il accepté ?**
Deux failles corrigées sans changer le contrat : un corps illisible sur `PUT /api/hr/users/{id}/manager` reçoit le
409 existant (au lieu de détacher le manager en silence) ; un `sort` hors liste est ignoré (au lieu d'une injection
SQL). Un 400 serait plus juste dans les deux cas.
→ Peut-on ajouter un code d'erreur, ou le contrat est-il strictement figé ?
*En attendant : contrat strictement inchangé.*

**Q4. Le corps des erreurs doit-il rester strictement identique ?**
Les erreurs 500 renvoyaient la stacktrace dans un champ `stack` (fuite d'information). Nous gardons le champ, mais
toujours vide, et ajoutons `errorId` pour retrouver l'erreur dans les journaux.
→ Est-ce acceptable ? Peut-on ajouter des champs standard (RFC 9457 : `type`, `title`, `status`) ?
*En attendant : format conservé, `stack` vide.*

## Règles métier

**Q5. Qui valide les notes d'un employé sans manager ? Que couvre « root » ?**
Le RH valide les notes des « root ». Dans le code, root = un manager sans manager. Un employé sans manager n'est
proposé à personne : ses notes restent en attente pour toujours. Et un RH seul dans son entreprise ?
→ « Root » inclut-il tout utilisateur sans manager (employé, RH) ?
*En attendant : comportement actuel.*

**Q6. Peut-on ajouter une valeur de `status` si une feature l'exige ?**
Exemple : une validation finance après la validation manager (`pending` → `approved` → `paid`).
*En attendant : statuts inchangés.*

**Q7. Peut-on retirer `receiptKey` des réponses, ou changer sa valeur ?**
La clé du reçu est prévisible (`receipts/42.png`) : on devine celle des autres notes. Le correctif standard est une
clé aléatoire, ce qui change la valeur du champ.
*En attendant : format inchangé.*

**Q10. Peut-on refuser un montant mal formé (« 8* », « 12abc ») ?**
L'app d'origine lit le montant avec `parseFloat` : « 8* » est accepté et enregistré comme 8. Le refuser (400) est
plus sûr mais transforme un succès en erreur pour ces entrées.
*En attendant : comportement d'origine gardé, la spec le décrit tel quel.*

## Évaluation

**Q8. Qu'attendent exactement les tests Sonar et « kube » ?**
→ Un quality gate SonarQube à passer ? Des manifestes Kubernetes ? Un déploiement réel ?

**Q9. Live coding : sur notre machine ? Et quelle est la date de la soutenance ?**
