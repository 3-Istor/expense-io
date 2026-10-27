---
id: T-0015
title: Observabilité métier et identifiant de requête
status: todo
risk: 1
source: prof
created: 2026-10-26
links: [cours 4, "docs/slo.md", T-0014, "coaching 2026-10-26"]
---

## Contexte

Aujourd'hui : une ligne JSON par appel d'API (opération, code, durée) et des SLO techniques (`docs/slo.md`). Il manque
ce que le cours 4 et le coaching demandent : des **métriques métier** (« les métriques HTTP disent que l'API répond ;
les métriques métier disent que la note est traitée ») et un **identifiant commun** pour relier les journaux d'une
même requête. Le contrat est gelé : pas de route `/metrics`, tout passe par les journaux et la base.

## Critères d'acceptation

- [ ] `handle()` attribue un `requestId` à chaque appel (repris de l'en-tête `x-request-id` s'il est fourni, sinon
      généré) et l'écrit dans chaque ligne de journal de la requête, erreurs comprises (`errorId` relié au `requestId`).
- [ ] Événements métier journalisés par les cas d'usage : `note soumise`, `note décidée` (décision, type de valideur,
      délai depuis la soumission en secondes). Aucun identifiant de personne en clair dans les journaux.
- [ ] `npm run metrics:business` lit la base et affiche : notes en attente par entreprise, ancienneté de la plus
      vieille, part des notes décidées en moins de 5 jours sur 28 jours.
- [ ] `docs/slo.md` gagne un SLI métier (notes décidées en moins de 5 jours ÷ notes soumises) avec son SLO.
- [ ] Contrat inchangé (oasdiff : aucun changement) ; tests unitaires des événements.

## Plan

1. `src/shared/http.ts` : `requestId` (AsyncLocalStorage ou paramètre) ; `src/lib/logger.ts` l'ajoute à chaque ligne.
2. Cas d'usage `submit`, `decide` : un `log('info', …)` chacun, champs bornés (pas d'id de note dans un label).
3. `scripts/business-metrics.ts` + script npm ; requêtes en lecture seule, sous le compte administrateur local.
4. `docs/slo.md` : section « SLI métier ».

## Notes

Dénominateur du SLI = notes **soumises**, pas décidées (piège du cours 4, slide « Un SLI métier ») : une note bloquée
sans valideur (T-0014) doit faire baisser le SLI, pas disparaître du calcul.
