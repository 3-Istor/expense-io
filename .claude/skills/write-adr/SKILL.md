---
name: write-adr
description: Écrire un ADR (décision d'architecture, format Nygard) pour une décision qui change le contrat, l'architecture, la sécurité ou un choix difficile à défaire.
---

# Écrire un ADR

## Quand

- Changer le contrat existant (code d'erreur, champ, valeur d'enum) : obligatoire (`AGENTS.md`).
- Choix d'architecture ou de sécurité difficile à défaire, ou qui contredit `docs/vision.md`.
- Pas pour un détail d'implémentation réversible : un commentaire suffit.

## Comment

1. Numéro suivant dans `docs/adr/` (`0005-…`), nom court en kebab-case, à partir de `docs/adr/0000-template.md`.
2. **Statut : proposé**. L'agent ne marque jamais un ADR « accepté » : seul un humain le fait.
3. Contexte (le problème, avec les preuves : test, constat, chiffre), Décision (une phrase, puis le détail),
   Conséquences (ce qui casse, qui est touché, ce qu'on ne fait pas), Alternative écartée et pourquoi.
4. Lier l'ADR depuis le code ou la doc concernés, et ajouter une entrée dans `docs/plan/QUESTIONS.md`.
5. En attendant la décision : appliquer l'option prudente si elle est réversible, sinon ne rien appliquer.

Un ADR rejeté reste dans le dépôt, avec son statut « rejeté » et la décision finale (exemple : `0002`, `0003`).
