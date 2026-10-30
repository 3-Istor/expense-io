# Répétitions du live coding

Trois demandes plausibles le jour J, traitées par l'agent en suivant le skill `add-feature`, sur des branches jetables
(`rehearsal/*`, jamais mergées). Les points de contrôle humains sont simulés et notés comme tels. Durées : temps de
l'agent, de la première commande au dernier commit (le temps de l'humain aux points de contrôle s'y ajoute en direct).

## Résultats

| Répétition | Niveau annoncé → réel | Durée agent | Tests | Ce que le harnais a attrapé |
| --- | --- | --- | --- | --- |
| 1. Export CSV des notes pour le RH (`rehearsal/export-csv`) | 2 → **3** | 8 min | 72 API (+3), 2 unitaires | S6 : route sur une fabrique non autorisée ; `risk` : la requête de périmètre est une règle d'accès ; **relecteur** : injection CSV via « ; » (Excel français), export non borné, pas de `no-store` |
| 2. Plafond par catégorie (`rehearsal/plafond-categorie`) | 2 → 2 (3 à tort, corrigé) | 4 min | 71 API (+2), 2 unitaires | Compilation : la sortie JSON doit suivre le contrat ; S4 : export inutilisé ; `expectNote` : champ ajouté visible ; **relecteur** : plafond contourné par `category=toString` (500 et reçu orphelin) |
| 3. Validation finance (`rehearsal/validation-finance`) | 3, arrêt | < 1 min | — | Arrêt correct avant tout code : deux enums gelés à changer ; ADR 0005 proposé, deux options et plan en 5 étapes |
| 4. Remboursement par le RH (`rehearsal/remboursement`) | 3 → 3 | 15 min | 252 API (+16), 127 unitaires (+8) | S5 : refuse 1.1.3, accepte 1.2.0 (ajout d'enum, ADR 0006) ; matrice et `methods.spec` : la nouvelle route entre d'office dans la grille ; T17c : une attente fausse de l'agent (le RH voit sa propre note) ; `risk` muet sur la RLS tant que la migration n'est pas indexée ; **relecteur** : RLS non testée en base, `down` qui effaçait la preuve du paiement (double remboursement), commentaire de migration trop prometteur |

### Répétition 4 : remboursement (2026-10-30, agent seul, points de contrôle simulés)

Demande : « le RH doit pouvoir marquer une note validée comme remboursée, pour que l'employé sache que l'argent est
parti ». Critère : `POST /api/hr/expense-notes/{id}/reimburse` (`hr_admin`) fait passer une note `approved` d'un autre
membre de son entreprise à `reimbursed`, une fois (409 ensuite) ; 403 autre rôle ; 404 autre entreprise, sa propre note,
note inconnue ou pas validée ; l'auteur voit `reimbursed` dans `GET /api/expense-notes`. Niveau annoncé 3 avant le code
(le RH agit désormais sur les notes des employés qui ont un manager : nouvelle règle d'accès et RLS), confirmé par
`risk`. Contrat 1.2.0 (valeur d'enum + route), validé par S5 ; validation humaine simulée du plan et du diff du contrat.
Un choix fait après la validation du contrat : moindre privilège en RLS, donc une note en attente ou rejetée donne 404
et non 409 ; le texte du contrat a été corrigé avant le code (à montrer à l'humain en direct). Le relecteur a trouvé
quatre points (aucun critique) : trois traités dans le diff (test RLS T17c, `down` qui refuse s'il reste des notes
remboursées, commentaire), un hors périmètre devenu T-0024 ; T-0025 note qu'aucune route ne liste les notes à rembourser.

## Ce qu'on en retient pour le jour J

1. **Le relecteur en contexte neuf vaut son coût** (≈ 1 min) : deux vrais bugs de sécurité sur deux features, invisibles
   pour les tests et la moulinette. Il est obligatoire dès le niveau 2.
2. **Annoncer le niveau de la demande, pas du diff** : `risk` classe ce qui a changé ; il a remonté une feature de
   2 à 3 (bien), mais un ADR seul ressort en niveau 0. Le niveau s'annonce depuis le plan, puis `risk` confirme.
3. **Le contrat gelé est la vraie contrainte du live coding** : toute feature réaliste ajoute un champ, un endpoint ou
   une valeur d'enum. Préparer la phrase : « c'est un niveau 2, voici le diff du contrat, je le valide ? ».
4. **Ordre de grandeur** : 4 à 8 minutes d'agent par feature de taille moyenne, plus 1 à 3 minutes de validation
   humaine. Une feature par séquence de 15 minutes est réaliste ; deux, c'est risqué.

## Frictions du harnais, et correctifs (branche `phase-5/qualite`)

| Friction | Correctif |
| --- | --- |
| `npm run risk` comparait à `origin/main` : sur une branche empilée, le niveau venait des commits du harnais | Variable `RISK_BASE`, documentée dans le skill |
| `npm run risk \| head` plantait (EPIPE) | Arrêt propre |
| Tout fichier `pg-` passait en niveau 3, même pour ajouter une colonne à un INSERT | Niveau 3 seulement si le diff touche le périmètre ou l'isolation (`SCOPE`, `manager_id`, `company_id`, `role`, `withUserScope`) ; testé |
| Lancer un seul test de contrat avec `-g` échouait toujours (vérification de couverture dans `afterAll`) | Couverture déplacée dans un dernier test ; réserve du relecteur notée dans `QUESTIONS.md` |
| Ajouter une fabrique de routes impose de modifier une règle Semgrep (niveau 3) | Gardé tel quel, c'est voulu : une nouvelle façon d'exposer une route doit être relue |
| Mon script d'édition a échoué sur des guillemets et le vert affiché était celui de l'ancien code | Leçon : relire le diff (`git diff --stat`) avant de croire un résultat vert |
| Répétition 4 : `npm run risk` (et S8) ne lit pas le contenu des fichiers non suivis : la migration RLS restait invisible (niveau 3 par d'autres fichiers, par chance) jusqu'au `git add` | À corriger (ticket à ouvrir) ; en attendant, `git add -A` avant `npm run risk` |
| Répétition 4 : le relecteur lancé en `claude -p` hors session de confiance n'a pas pu exécuter `vitest` (approbation refusée) | Lui donner `Bash(npx vitest:*)` dans `--allowedTools`, ou le lancer comme subagent de la session |
