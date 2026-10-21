# Déploiement Kubernetes

Manifestes de base (sans Helm ni Kustomize, volontairement) pour l'image du `Dockerfile` :

| Fichier | Rôle |
| --- | --- |
| `configmap.yaml` | Configuration non secrète (S3, région) |
| `secret.example.yaml` | Modèle des secrets, **valeurs à remplacer** (jamais de vraies valeurs dans le dépôt) |
| `migrate-job.yaml` | Job de migration, compte administrateur (`DATABASE_ADMIN_URL`), à lancer avant chaque version |
| `deployment.yaml` | 2 réplicas, non-root, sondes sur `/login` (aucun endpoint ajouté : contrat gelé) |
| `service.yaml` | Service interne, port 80 → 3000 |
| `pdb.yaml` | Au moins 1 réplica disponible pendant une maintenance |

Ordre : `kubectl apply -f configmap.yaml -f secret.yaml`, puis le Job de migration, puis le reste.
`AUTH_SECRET` doit être fixé dans le Secret : sans lui, chaque réplica génère le sien et les sessions ne passent pas
d'un réplica à l'autre (`src/lib/auth-secret.ts`).

Validation : `npm run k8s:validate` (schémas Kubernetes 1.34, mode strict), lancée par la moulinette (S7).
