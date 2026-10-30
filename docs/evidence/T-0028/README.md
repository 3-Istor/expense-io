# T-0028 — Preuve : Umami branché, désactivé par défaut

Date : 2026-10-30 · Demande de Brian.

- `src/lib/umami.ts` + `tests/unit/umami.test.ts` : désactivé sans configuration, avec une URL non https ou un
  identifiant mal formé ; actif avec une URL https et un UUID.
- `src/app/layout.tsx` : `<Script>` Umami chargé seulement si configuré (`data-do-not-track`, `data-exclude-search`).
- Boutons marqués `data-umami-event` : `suggestion-ocr`, `note-soumise`, `note-approuvee`, `note-rejetee`.
- Sans variable fixée (cas des profs), le rendu ne change pas : aucune balise ajoutée, tests d'API inchangés.
- Pour le brancher : créer le site dans Umami, puis fixer `UMAMI_SCRIPT_URL` et `UMAMI_WEBSITE_ID` dans `.env`.
- Totaux : 125 tests unitaires, 237 tests d'API, test:db vert, moulinette `pr` verte. `npm audit` : 0 vulnérabilité (production et développement).

## Relecture en contexte neuf (security-reviewer)

Rien de bloquant : pas d'injection par les variables (UUID et https validés, props échappées), aucune donnée
personnelle (pas d'identifiant dans les URL de l'interface, paramètres exclus), rien ne change sans configuration,
variables lues à l'exécution. Ouvert : T-0029 (CSP pour limiter le script tiers à son hôte).
