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
