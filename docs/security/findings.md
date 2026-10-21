# Fiches de failles (phase 2)

Format : ID, titre, CWE, catégorie OWASP API Security Top 10 (2023), CVSS v4.0 (vecteur et score calculés par la
bibliothèque Python `cvss`, pas estimés), preuve (le test qui échouait), correctif, statut.
SEC-NN = correctif n° NN du document de vision. Constats d'origine : `docs/audit/avant/`.

## SEC-02 — Secret de session écrit dans le code

- **CWE** : CWE-798 (identifiants en dur) · **API Top 10** : API2:2023 Broken Authentication
- **CVSS v4.0** : 9.3 critique — `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N`
- **Preuve** : T18b (`tests/api/authz.spec.ts`) forge une session RH d'une autre entreprise avec le secret lu dans
  l'historique Git, et obtient l'annuaire (200). Semgrep `secret-en-dur` sur `src/lib/auth.ts:8`.
- **Correctif** : `AUTH_SECRET` lu dans l'environnement, jamais dans le code (`src/lib/auth-secret.ts`, tests unitaires).
  Décision de Brian (2026-10-21) : l'app doit démarrer sans configuration (moulinette des profs). Un secret absent,
  ou égal à une valeur publique connue (l'ancien secret du dépôt, la valeur d'exemple de `.env.example`, repérés par
  empreinte SHA-256), est remplacé par un secret aléatoire propre au processus, avec un avertissement. `make env` en
  écrit un dans `.env`. Vérifié : app lancée sans `AUTH_SECRET`, connexion 302 puis liste 200.
- **Reste à faire (humain)** : le secret publié reste dans l'historique Git pour toujours. Il ne protège plus rien
  puisqu'il n'est plus utilisé, mais tout environnement déployé avec lui doit changer de secret (les sessions
  existantes tombent). gitleaks le retrouvera dans l'historique (scan de nuit) : le marquer comme révoqué relève d'un
  humain (`false-positives.md`).
- **Limite** : sans `AUTH_SECRET` fixé, les sessions tombent à chaque redémarrage, et plusieurs instances n'auraient
  pas le même secret. Sans effet pour la démo et la moulinette ; en production, fixer la variable.
- **Statut** : corrigé, T18b vert sans marquage.

## SEC-07 — Stacktrace et détail SQL renvoyés au client ; erreurs qui échappent au catch

- **CWE** : CWE-209 (message d'erreur qui révèle de l'information), CWE-755 (exception mal gérée)
  · **API Top 10** : API8:2023 Security Misconfiguration
- **CVSS v4.0** : 5.3 moyenne — `CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:L/VI:N/VA:N/SC:N/SI:N/SA:N`
- **Preuve** : T14b (500 avec `stack` et « invalid input syntax for type uuid ») ; T14c, nouveau (500 au corps vide
  quand la route fait `return withUserScope(...)` sans `await`). Semgrep : `stacktrace-dans-la-reponse`,
  `promesse-renvoyee-sans-await-dans-try` ×7.
- **Correctif** : `respondError` journalise l'erreur avec un identifiant et renvoie
  `{error: "Erreur interne", errorId, stack: ""}` (`stack` gardé vide pour la forme du contrat) ;
  `return await withUserScope(...)` dans les 7 routes. Contrat : `stack` retiré des 500, comme annoncé dans
  `docs/contract.md` ; `errorId` ajouté (ajout de champ permis). Le format RFC 9457 reste à décider (ADR).
- **Statut** : corrigé. T14b et T14c verts sans marquage ; Semgrep 16 → 8 constats, seuil du cliquet resserré à 8 ;
  les 2 avertissements Spectral de SEC-07 ont disparu.

## SEC-03 — Un manager lit le reçu de n'importe quelle note

- **CWE** : CWE-639 (contournement d'autorisation par clé contrôlée par l'utilisateur, IDOR)
  · **API Top 10** : API1:2023 Broken Object Level Authorization
- **CVSS v4.0** : 7.1 élevée — `CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N`
- **Preuve** : T11, URL signée obtenue (200) pour la note d'un autre manager de l'entreprise et pour une note d'une
  autre entreprise. Cause écrite dans le code : « la note existe forcément dans la liste… pas besoin de revérifier ».
- **Correctif** : la route vérifie le rattachement direct (`u.manager_id = appelant`), dans `withUserScope`, comme les
  routes de décision. Hors périmètre : 404, code déjà prévu par le contrat.
- **Statut** : corrigé, T11 vert sans marquage ; Semgrep 8 → 7.

## SEC-08 — Une note peut être validée ET rejetée par deux requêtes simultanées

- **CWE** : CWE-362 (situation de compétition) · **API Top 10** : API6:2023 Unrestricted Access to Sensitive Business Flows
- **CVSS v4.0** : 2.3 faible — `CVSS:4.0/AV:N/AC:L/AT:P/PR:L/UI:N/VC:N/VI:L/VA:N/SC:N/SI:N/SA:N`
- **Preuve** : T15, 100 paires approve/reject simultanées : au moins une paire renvoie deux 200 (reproduit 3 fois sur 3).
- **Correctif** : condition `status = 'pending'` dans l'`UPDATE` lui-même ; aucune ligne modifiée → 409, code déjà
  prévu par le contrat. Écrit une seule fois dans `src/lib/approvals.ts` grâce au regroupement précédent.
- **Statut** : corrigé, T15 vert sans marquage, 3 exécutions sur 3.

## SEC-04 — Le RH rattache un employé à un manager d'une autre entreprise

- **CWE** : CWE-639 · **API Top 10** : API1:2023 Broken Object Level Authorization
- **CVSS v4.0** : 5.1 moyenne — `CVSS:4.0/AV:N/AC:L/AT:N/PR:H/UI:N/VC:L/VI:L/VA:N/SC:L/SI:L/SA:N`
- **Preuve** : T12 (200, rattachement inter-entreprises accepté). Cause écrite dans le code : « l'appartenance à la même
  entreprise est déjà garantie par l'annuaire ».
- **Correctif** : la route exige un manager de la même entreprise (sinon 409, déjà au contrat). La garantie en base
  (contrainte ou RLS sur `users`) reste à faire avec SEC-05.
- **Statut** : corrigé côté application, T12 vert sans marquage.

## SEC-14 — Cycles de managers acceptés

- **CWE** : CWE-840 (erreur de logique métier) · **API Top 10** : API6:2023
- **CVSS v4.0** : 5.1 moyenne — `CVSS:4.0/AV:N/AC:L/AT:N/PR:H/UI:N/VC:N/VI:L/VA:L/SC:N/SI:N/SA:N`
- **Preuve** : T12b (A manage B puis B manage A : 200). Un cycle rend les notes de ces managers invalidables
  (aucun n'est racine pour le RH).
- **Correctif** : requête récursive sur la chaîne hiérarchique du manager choisi, dans la même transaction que l'écriture
  (`FOR UPDATE` sur la cible) ; cycle → 409.
- **Statut** : corrigé, T12b vert sans marquage.

## SEC-09 — Un corps illisible détache le manager

- **CWE** : CWE-20 (validation d'entrée incorrecte) · **API Top 10** : API8:2023
- **CVSS v4.0** : 5.1 moyenne — `CVSS:4.0/AV:N/AC:L/AT:N/PR:H/UI:N/VC:N/VI:L/VA:N/SC:N/SI:N/SA:N`
- **Preuve** : T13 (`manager_id` passé à `null` après un corps `{ pas du json`).
- **Correctif** : corps validé strictement ; sinon 409 « Invalid manager », code déjà au contrat (l'ADR 0002, qui
  proposait un 400, est rejeté : contrat gelé).
- **Statut** : corrigé, T13 vert sans marquage, test de contrat ajouté.

## SEC-01 — Injection SQL par le paramètre `sort`

- **CWE** : CWE-89 · **API Top 10** : API8:2023 Security Misconfiguration (injection)
- **CVSS v4.0** : 7.1 élevée — `CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N`
- **Preuve** : T14, tri booléen sur une sous-requête arbitraire accepté (200) : chaque réponse révèle un bit d'une
  donnée quelconque de la base (injection aveugle). Semgrep `sql-fragment-concatene`.
- **Correctif** : liste fermée de tris, chacun lié à une requête constante ; toute autre valeur est ignorée (tri par
  défaut, 200). L'ADR 0003, qui proposait un 400, est rejeté (contrat gelé). Tests : tri valide appliqué, tri hors liste
  ignoré, `(SELECT 1/0)` injecté jamais exécuté.
- **Statut** : corrigé, T14 vert sans marquage ; Semgrep 3 → 2.

## SEC-10 — Un rôle retiré en base reste actif tant que le jeton vit

- **CWE** : CWE-613 (expiration de session insuffisante) · **API Top 10** : API5:2023 Broken Function Level Authorization
- **CVSS v4.0** : 2.3 faible — `CVSS:4.0/AV:N/AC:L/AT:P/PR:L/UI:N/VC:L/VI:L/VA:N/SC:N/SI:N/SA:N`
- **Preuve** : T18, un manager rétrogradé en employé garde l'accès aux routes manager (200).
- **Correctif** : le callback `jwt` d'Auth.js relit le rôle en base à chaque requête ; compte introuvable → plus de session.
  Coût : une requête indexée (clé primaire) par appel authentifié, à surveiller en phase 4 (SLO de latence).
- **Statut** : corrigé, T18 vert sans marquage.

## SEC-05 — La RLS ne protège rien (rôle superutilisateur, politiques sans entreprise)

- **CWE** : CWE-250 (privilèges inutiles), CWE-284 · **API Top 10** : API1:2023
- **CVSS v4.0** : 6.0 moyenne — `CVSS:4.0/AV:N/AC:L/AT:P/PR:L/UI:N/VC:H/VI:L/VA:N/SC:N/SI:N/SA:N` (aucune exploitation directe : c'est la seconde ligne de
  défense qui manque ; la gravité tient à ce que toute faille applicative devient une fuite inter-entreprises)
- **Preuve** : T16 (rôle de connexion superutilisateur), T17 (8 politiques sans entreprise), T17b, nouveau : avec les
  anciennes politiques, le RH de B lit la note d'un manager de A sous un rôle soumis à la RLS (1 ligne au lieu de 0).
- **Correctif, partie faite** : migration `1700000000002_rls-par-entreprise.sql` (réversible, testée up/down/up) :
  rôle `expense_app` NOLOGIN, ni superuser ni BYPASSRLS, droits minimaux ; politiques qui comparent l'entreprise de
  l'auteur à celle de l'appelant ; `withUserScope` endosse `expense_app` (`SET LOCAL ROLE`). Les 66 tests d'API
  passent sous la RLS réelle.
- **Reste à faire (décision humaine, voir QUESTIONS.md)** : se connecter avec un rôle dédié non superutilisateur
  (mot de passe, donc secret et `.env`, interdits à l'agent) et passer sous `withUserScope` les requêtes restantes
  (`getPool()` de la connexion Auth.js, de l'annuaire RH et de l'enregistrement du reçu).
- **Statut** : partiellement corrigé. T17 et T17b verts ; T16 reste en échec attendu, avec un motif mis à jour.

## SEC-12 — Note créée sans reçu si le stockage échoue

- **CWE** : CWE-460 (nettoyage incorrect après une exception) · **API Top 10** : API8:2023
- **CVSS v4.0** : 2.3 faible — `CVSS:4.0/AV:N/AC:L/AT:P/PR:L/UI:N/VC:N/VI:L/VA:L/SC:N/SI:N/SA:N`
- **Preuve** : `tests/unit/create-note-storage-failure.test.ts` : stockage en panne, la note était quand même insérée
  (`INSERT` exécuté, puis 500), donc une note en attente sans reçu, puis jamais complétée.
- **Correctif** : numéro de reçu réservé (`nextval`), reçu stocké, puis note insérée avec sa clé, sous `withUserScope`.
  L'`UPDATE` hors contexte utilisateur disparaît (Semgrep 2 → 1). Format de clé inchangé : la clé opaque (SEC-13)
  attend la réponse des profs sur `receiptKey`.
- **Statut** : corrigé ; test unitaire vert (rouge sur l'ancien code), 66 tests d'API verts.

## SEC-06 — Auto-validation interdite explicitement (défense en profondeur)

- **CWE** : CWE-863 (autorisation incorrecte) · **API Top 10** : API5:2023
- **CVSS v4.0** : non noté (pas de faille exploitable aujourd'hui : T07 passait déjà, la règle découlait du périmètre).
- **Preuve** : T07 (garde-fou). La règle « acteur ≠ auteur » n'était écrite nulle part : elle tenait par accident
  (un manager n'est pas son propre subordonné, un RH n'est pas manager racine).
- **Correctif** : `en.user_id <> appelant` dans les trois requêtes de périmètre de `src/lib/approvals.ts`.
- **Statut** : fait. Avec le passage de l'annuaire RH sous `withUserScope`, Semgrep tombe à 0 constat (seuil 0).

## SEC-11 — OCR non borné (déni de service)

- **CWE** : CWE-400 (consommation de ressources non contrôlée) · **API Top 10** : API4:2023 Unrestricted Resource Consumption
- **CVSS v4.0** : 7.1 élevée — `CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:N/VI:N/VA:H/SC:N/SI:N/SA:N`
- **Preuve** : un fichier de plus de 10 Mo était accepté et passé à Tesseract (200 sur l'ancien code) ; aucun délai,
  aucune limite de concurrence : quelques requêtes simultanées occupent tout le processeur.
- **Correctif** : taille maximale de 10 Mo (400, code déjà au contrat de la route), délai de 15 s qui arrête le
  worker, au plus 2 OCR simultanés, les suivants attendent (`src/lib/limits.ts`, tests unitaires). Un OCR qui dépasse
  le délai renvoie une suggestion vide, comme une erreur d'OCR aujourd'hui.
- **Statut** : corrigé ; test de contrat « reçu de plus de 10 Mo » (rouge sur l'ancien code) et 3 tests unitaires verts.

## SEC-15 — Inscription par domaine email sans vérification

- **CWE** : CWE-287 · **API Top 10** : API2:2023 Broken Authentication
- **CVSS v4.0** : non calculé (dépend du déploiement : critique en production, sans objet en démo)
- **Preuve** : lecture de `src/app/actions/auth.ts`. Le premier inscrit d'un domaine devient RH, et aucune adresse
  n'est vérifiée. Pas de test automatisé : `signup` est une server action, hors du contrat HTTP testé.
- **Décision** : conservé pour la démo, risque et correctif cible documentés dans l'ADR 0004 (statut proposé).
- **Statut** : accepté temporairement, à valider par un humain.
