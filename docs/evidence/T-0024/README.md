# T-0024 — Preuve : la base borne la mise à jour au statut

Date : 2026-10-30 · Niveau 3 (RLS) · Plan validé par Brian.

- Test `T17d` (`tests/api/authz.spec.ts`), sous le rôle applicatif, pour un manager puis un RH :
  - sur les anciennes politiques, il échouait : une note déjà décidée était réécrite (`rowCount` 1 au lieu de 0) ;
  - après la migration 0008 : note décidée non modifiable (0 ligne) ; passage à `pending` refusé par la RLS ;
    décision au nom d'un autre (`decided_by`) refusée ; décision normale sur une note en attente acceptée (1 ligne).
- Le SQL de l'application ne change pas : il respectait déjà ces règles. Contrat inchangé.
- Totaux : 119 tests unitaires, 237 tests d'API, test:db vert, moulinette `pr` verte.
