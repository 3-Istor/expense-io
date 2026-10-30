# Tickets

Le travail à faire vit dans le dépôt, à côté du code, lisible par l'humain et par l'agent. Un ticket = un fichier
`T-NNNN-<sujet>.md` ; ses preuves vont dans `docs/evidence/T-NNNN/`. La moulinette (S10) refuse un ticket mal formé et
un ticket « done » sans preuve ni critères cochés.

Pourquoi dans le dépôt : l'agent lit les tickets sans connecteur, les relie aux commits, et une session ne perd pas ce
qu'elle a vu en passant. Inspiré de [Backlog.md](https://github.com/MrLesk/Backlog.md) (une tâche Markdown par fichier,
critères vérifiables, plan écrit avant le code) et de Spec Kit (spécification, plan, tâches).

## Format

```markdown
---
id: T-0012
title: Monter Next.js en 16.4.3
status: todo        # todo | doing | blocked | done
risk: 3             # niveau de risque attendu (AGENTS.md)
source: audit       # audit | session | review | prof | human
created: 2026-10-26
links: [SEC-02, Q7, "PR #10"]
---

## Contexte
Pourquoi, avec la preuve (constat, test, chiffre).

## Critères d'acceptation
- [ ] Vérifiable par une commande ou un test.

## Plan
Écrit avant le code ; validé par un humain dès le niveau 2.

## Notes
Ce qui a été appris en route.
```

## Cycle

1. `todo` : écrit par un humain, par l'audit, ou par l'agent qui voit un problème hors périmètre (skill `write-ticket`).
2. `doing` : une session prend le ticket, écrit le plan, annonce le niveau de risque.
3. `blocked` : attend une décision (question dans `docs/plan/QUESTIONS.md` ou aux profs) ; le ticket dit laquelle.
4. `done` : critères cochés, `scripts/evidence.sh T-NNNN` a rangé la preuve (moulinette, tests, niveau de risque, commit).

## Index

| Ticket | Statut | Risque | Sujet |
| --- | --- | --- | --- |
| [T-0001](T-0001-cle-de-recu-previsible.md) | done | 2 | SEC-13 : clé de reçu prévisible (clé de stockage opaque) |
| [T-0002](T-0002-inscription-par-domaine.md) | blocked | 3 | SEC-15 : inscription par domaine email |
| [T-0003](T-0003-erreurs-rfc-9457.md) | doing | 2 | Erreurs au format RFC 9457 (fusionné ; confirmation A2) |
| [T-0004](T-0004-differentiel-app-origine.md) | todo | 1 | Différentiel avec l'app d'origine |
| [T-0005](T-0005-reglages-github.md) | todo | 3 | Réglages GitHub (protection de main, alertes) |
| [T-0006](T-0006-validation-finance.md) | todo | 3 | Validation finance (variante A en mineure après T-0016) |
| [T-0007](T-0007-ocr-asynchrone.md) | todo | 2 | OCR asynchrone, si le volume l'exige |
| [T-0008](T-0008-montant-mal-forme.md) | blocked | 2 | Refuser un montant mal formé (Q10) |
| [T-0009](T-0009-actions-node-24.md) | todo | 3 | Actions GitHub sur Node 24 |
| [T-0010](T-0010-harden-runner-blocage.md) | todo | 3 | Bloquer le trafic sortant inconnu des runners |
| [T-0011](T-0011-next-16-4-3.md) | done | 3 | Next.js 16.4.3 et chaîne d'approvisionnement |
| [T-0012](T-0012-analyse-image-bloquante.md) | todo | 3 | Analyse de l'image bloquante sur ce qui se corrige |
| [T-0013](T-0013-index-mesures.md) | todo | 2 | Index SQL décidés par la mesure |
| [T-0014](T-0014-notes-sans-valideur.md) | done | 3 | Notes d'un utilisateur sans manager routées vers le RH |
| [T-0015](T-0015-observabilite-metier.md) | done | 1 | Observabilité métier et identifiant de requête |
| [T-0016](T-0016-enum-ajout-mineure.md) | done | 3 | S5 : ajout de valeur d'enum = mineure |
| [T-0019](T-0019-enum-devenu-enum.md) | todo | 3 | S5 : « became-enum » en réponse, mineure ou rupture |
| [T-0020](T-0020-detacher-pour-valider.md) | done | 3 | RH : détacher un employé pour valider sa note |
| [T-0021](T-0021-metriques-red-use.md) | done | 2 | Métriques Prometheus : RED, USE et métier sur /metrics |
| [T-0022](T-0022-controle-routes-hors-api.md) | todo | 3 | Semgrep : contrôle d’accès des routes hors src/app/api |
| [T-0023](T-0023-uuid-majuscules-auto-rattachement.md) | done | 3 | Auto-rattachement d’un manager avec un UUID en majuscules |
| [T-0017](T-0017-migrer-anciens-recus.md) | todo | 2 | Déplacer les anciens reçus sous une clé opaque |
| [T-0018](T-0018-droits-de-mise-a-jour-par-colonne.md) | todo | 3 | UPDATE du rôle applicatif limité aux colonnes de décision |
