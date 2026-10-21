---
name: triage-finding
description: Trier un constat d'outil (Semgrep, gitleaks, SonarQube, npm audit, OSV, Spectral) en vrai positif, faux positif prouvé ou incertain, selon la politique docs/security/false-positives.md.
---

# Trier un constat d'outil

Un constat n'est jamais supprimé en silence. Trois issues seulement.

## 1. Comprendre

- Lire la règle (identifiant, CWE) et le code exact signalé, avec 20 lignes de contexte.
- Chercher le chemin d'entrée : la donnée vient-elle d'un utilisateur, d'une autre entreprise, d'une constante ?

## 2. Décider

1. **Vrai positif** : corriger. D'abord un test qui échoue et prouve la faille (au besoin `test.fail` avec la
   référence SEC-NN), puis le correctif, qui retire le marquage. Fiche dans `docs/security/findings.md` (CWE,
   OWASP API Top 10, CVSS v4.0 calculé avec la bibliothèque Python `cvss`, preuve, correctif, statut).
2. **Faux positif prouvé**, seulement avec une preuve concrète : code inatteignable, entrée non contrôlée par un
   attaquant, protection déjà en place (citer le test qui la démontre), fichier hors production. Suppression dans le
   format natif de l'outil, avec raison et date d'expiration (`docs/security/false-positives.md`).
   **Interdit à l'agent** si la gravité est élevée ou critique, ou si le code touche l'authentification ou l'isolation
   entre entreprises : c'est l'humain qui supprime.
3. **Incertain** : ne rien supprimer. Écrire dans `docs/plan/QUESTIONS.md` le constat, les preuves, et ce qu'il
   faudrait pour trancher.

## 3. Affiner une règle maison (`.semgrep/`)

Une règle peut être rendue plus précise (niveau 3), jamais désactivée. Toujours vérifier sur une **sonde** : un fichier
temporaire qui DOIT être signalé l'est encore, et le cas légitime ne l'est plus. Supprimer la sonde ensuite.
