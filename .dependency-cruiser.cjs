// Règles d'architecture vérifiées par la moulinette (contrôle S2).
// Chaque règle porte un commentaire qui dit comment corriger : l'agent le lit dans le rapport.
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'domaine-sans-infrastructure',
      comment:
        "Le domaine ne dépend de rien de technique. Déplacer l'appel technique dans un adaptateur et passer par un port.",
      severity: 'error',
      from: { path: '(^src/domain/|/domain/)' },
      to: { path: '(^src/lib/|^src/app/|/infrastructure/|^src/adapters/|node_modules/(pg|next|next-auth|@aws-sdk|tesseract\\.js)/)' },
    },
    {
      name: 'ports-sans-implementation',
      comment: "Un port est une interface : il ne doit importer aucune implémentation. Déplacer le code dans un adaptateur.",
      severity: 'error',
      from: { path: '(^src/ports/|/ports/)' },
      to: { path: '(^src/lib/|^src/adapters/|/infrastructure/|node_modules/)' },
    },
    {
      name: 'pas-de-cycle',
      comment: 'Les cycles rendent les modules inséparables. Extraire la partie commune dans un module partagé.',
      severity: 'warn',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
  },
}
