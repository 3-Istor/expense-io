# Fiches de failles (phase 2)

Format : ID, titre, CWE, catégorie OWASP API Security Top 10 (2023), CVSS v4.0 (vecteur et score calculés par la
bibliothèque Python `cvss`, pas estimés), preuve (le test qui échouait), correctif, statut.
SEC-NN = correctif n° NN du document de vision. Constats d'origine : `docs/audit/avant/`.

## SEC-02 — Secret de session écrit dans le code

- **CWE** : CWE-798 (identifiants en dur) · **API Top 10** : API2:2023 Broken Authentication
- **CVSS v4.0** : 9.3 critique — `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N`
- **Preuve** : T18b (`tests/api/authz.spec.ts`) forge une session RH d'une autre entreprise avec le secret lu dans
  l'historique Git, et obtient l'annuaire (200). Semgrep `secret-en-dur` sur `src/lib/auth.ts:8`.
- **Correctif** : `AUTH_SECRET` lu dans l'environnement ; `src/instrumentation.ts` signale au démarrage un secret
  absent ou de moins de 32 caractères (`src/lib/auth-secret.ts`, test unitaire) ; `make env` en génère un aléatoire
  dans `.env` ; les tests en génèrent un par exécution.
- **Reste à faire (humain)** : le secret publié reste dans l'historique Git pour toujours. Il ne protège plus rien
  puisqu'il n'est plus utilisé, mais tout environnement déployé avec lui doit changer de secret (les sessions
  existantes tombent). gitleaks le retrouvera dans l'historique (scan de nuit) : le marquer comme révoqué relève d'un
  humain (`false-positives.md`).
- **Limite constatée** : en `next dev`, l'erreur de démarrage est journalisée mais le serveur continue ; Auth.js
  refuse alors toute session. Comportement de `next start` à vérifier en phase 4 (Dockerfile).
- **Statut** : corrigé, T18b vert sans marquage.

## SEC-07 — Stacktrace et détail SQL renvoyés au client ; erreurs qui échappent au catch

- **CWE** : CWE-209 (message d'erreur qui révèle de l'information), CWE-755 (exception mal gérée)
  · **API Top 10** : API8:2023 Security Misconfiguration
- **CVSS v4.0** : 5.3 moyenne — `CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:L/VI:N/VA:N/SC:N/SI:N/SA:N`
- **Preuve** : T14b (500 avec `stack` et « invalid input syntax for type uuid ») ; T14c, nouveau (500 au corps vide
  quand la route fait `return withUserScope(...)` sans `await`). Semgrep : `stacktrace-dans-la-reponse`,
  `promesse-renvoyee-sans-await-dans-try` ×7.
- **Correctif** : `respondError` journalise l'erreur avec un identifiant et renvoie `{error: "Erreur interne", errorId}` ;
  `return await withUserScope(...)` dans les 7 routes. Contrat : `stack` retiré des 500, comme annoncé dans
  `docs/contract.md` ; `errorId` ajouté (ajout de champ permis). Le format RFC 9457 reste à décider (ADR).
- **Statut** : corrigé. T14b et T14c verts sans marquage ; Semgrep 16 → 8 constats, seuil du cliquet resserré à 8 ;
  les 2 avertissements Spectral de SEC-07 ont disparu.
