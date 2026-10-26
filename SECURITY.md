# Politique de sécurité

## Signaler une faille

Ne pas ouvrir d'issue publique. Utiliser **Security → Report a vulnerability** (signalement privé GitHub) sur
`3-Istor/expense-io`. Réponse sous 72 heures ouvrées ; correctif ou décision tracée sous 14 jours pour une faille
élevée ou critique.

## Ce qui est en place

- Failles connues et corrigées : `docs/security/findings.md` (score CVSS v4, test qui la prouve).
- Faux positifs : `docs/security/false-positives.md` (raison, preuve, date d'expiration).
- Dépendances et CI : `docs/security/supply-chain.md` (mises à jour, quarantaine, paquets critiques, CI durcie).

## Versions supportées

Seule la branche `main` reçoit des correctifs.
