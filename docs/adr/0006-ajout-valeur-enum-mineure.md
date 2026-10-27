# 0006 — Ajouter une valeur d'enum de réponse est une version mineure

- Statut : accepté (2026-10-27, Brian : « ok for all » sur le plan T-0016, règle donnée par les profs au coaching du 2026-10-26)
- Niveau de risque : 3 (`verify/` : on change une règle de la moulinette)

## Contexte

S5 classe le changement de contrat avec oasdiff et exige une majeure pour tout avertissement ou erreur. oasdiff classe
`response-property-enum-value-added` en **erreur** : un client qui fait un `switch` exhaustif sur `status` peut casser
sur une valeur inconnue. Il classe au contraire `response-property-enum-value-removed` en **info** : le client reçoit
moins de cas.

Au coaching (Q6), les profs ont tranché : « ajouter dans un enum, ce n'est pas une majeure, c'est une mineure ; par
contre enlever dans un enum, c'est une majeure ». Sans changer S5, la validation finance (T-0006, nouveau statut)
imposerait une 2.0.0 que les profs ne demandent pas.

## Décision

S5 applique une politique au-dessus du verdict d'oasdiff (`verify/lib/contract-version.ts`) :

- `response-property-enum-value-added` et `response-mediatype-enum-value-added` : **ajout**, version mineure ;
- `response-property-enum-value-removed` et `response-mediatype-enum-value-removed` : **rupture**, majeure + ADR ;
- tout le reste : le niveau d'oasdiff, inchangé (avertissement ou erreur = rupture).

En échange, le contrat promet explicitement que de nouvelles valeurs peuvent apparaître (`docs/contract.md`), et chaque
ajout de valeur est annoncé dans `docs/contract-changelog.md`.

## Conséquences

- T-0006 variante A (statut `finance_pending`) devient une 1.x mineure, sans ADR de rupture.
- Risque résiduel (loi de Hyrum) : un client strict peut casser sur une valeur nouvelle. Atténuation : la règle est
  écrite dans le contrat, l'ajout est annoncé, et le skill `contract-change` propose toujours d'abord un nouveau champ.
- La liste est fermée et testée (`tests/unit/contract-version.test.ts`) : un nouvel identifiant oasdiff n'est jamais
  assoupli par défaut.
