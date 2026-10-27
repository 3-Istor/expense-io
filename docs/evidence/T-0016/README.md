# T-0016 — Preuve : ajout de valeur d'enum = mineure, retrait = majeure

Date : 2026-10-27 · Niveau 3 (`verify/`) · ADR 0006 accepté par Brian.

## Classement sur une vraie sortie d'oasdiff

Spec de `main` (contrat 1.1.1), puis `ExpenseNoteStatus` avec `paid` ajouté, puis avec `rejected` retiré.
`oasdiff changelog base.yaml variante.yaml --format json`, passé à `changeKind` et `checkVersion` :

```
added response-property-enum-value-added (oasdiff level 3) → additive | 1.1.1→1.2.0: true | 1.1.1→2.0.0: true
removed response-property-enum-value-removed (oasdiff level 1) → breaking | 1.1.1→1.2.0: false | 1.1.1→2.0.0: true
```

Avant T-0016 l'ajout était classé « breaking » (niveau 3 d'oasdiff) et le retrait « additive » (niveau 1) :
exactement l'inverse de la règle des profs.

## Tests

- `tests/unit/contract-version.test.ts` : 2 scénarios ajoutés (ajout → mineure, y compris `mediatype` ; un ajout
  mêlé à une autre rupture reste une rupture ; retrait côté réponse, `property` et `mediatype`, et côté requête → rupture).
- Unitaires :       Tests  109 passed (109)
- Moulinette `pr` : voir `verify-summary.md` au moment du commit (S5 « contrat inchangé » : la politique ne change
  pas la version actuelle).

## Relecture en contexte neuf (security-reviewer)

Rien de bloquant. Trois constats faibles : le résumé de S5 listait les ruptures selon le niveau brut d'oasdiff
(corrigé : il passe par `policyLevel`) ; le retrait `mediatype` n'était pas testé (test ajouté) ;
`response-*-became-enum` reste « info », comportement antérieur hors périmètre (ticket T-0019).
