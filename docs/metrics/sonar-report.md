# Rapport SonarQube

Analyse locale (SonarQube Community, `make sonar-up` puis `make sonar`) du commit `c6ece4c`, le 2026-10-21.
Périmètre : 68 fichiers sources, 2 210 lignes de code. Quality gate : **OK**.

| Mesure | Valeur | Note |
| --- | --- | --- |
| Vulnérabilités | 0 | A |
| Security hotspots | 0 | |
| Bugs | 4 | C |
| Code smells | 2 | A (maintenabilité) |
| Couverture | 28,7 % | |
| Duplication | 0,0 % | |

## Constats ouverts

| Sévérité | Type | Fichier | Règle | Constat |
| --- | --- | --- | --- | --- |
| MAJOR | Bug | `src/app/expenses/page.tsx:71` | S9383 | Promesse non attendue ni rattrapée |
| MAJOR | Bug | `src/components/AdminConsole.tsx:65` | S9383 | Promesse non attendue ni rattrapée |
| MAJOR | Bug | `src/components/AdminConsole.tsx:66` | S9383 | Promesse non attendue ni rattrapée |
| MAJOR | Bug | `src/components/PendingApprovalsPanel.tsx:39` | S9383 | Promesse non attendue ni rattrapée |
| MAJOR | Code smell | `src/modules/identity/domain/user.ts:29` | S8786 | Expression régulière à performance super-linéaire |
| MINOR | Code smell | `src/modules/expense-notes/domain/expense-note.ts:40` | S7773 | Préférer `Number.NaN` à `NaN` |

Aucun constat n'est supprimé ni marqué faux positif.

## Corrections (2026-10-21, branche `phase-5/qualite`)

| Constat | Correction | Preuve |
| --- | --- | --- |
| S8786, expression régulière super-linéaire (`user.ts:29`) | Classes disjointes du `@`, puis contrôle du point sans regex (`emailDomain`) : vérification linéaire | Test : même résultat que l'ancienne expression sur 11 cas ; entrée piégée de 100 000 caractères en moins de 100 ms |
| S9383 ×4, promesses non rattrapées | `.catch` qui affiche l'erreur et arrête le chargement (avant : une panne réseau laissait l'écran bloqué sur « chargement ») | Revue du code ; aucune régression sur les 69 tests d'API |
| S7773, `NaN` | `Number.NaN` | — |

À confirmer par une nouvelle analyse (`make sonar`) : attendu 0 bug, 0 code smell.
