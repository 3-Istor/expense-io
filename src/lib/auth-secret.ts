/**
 * Secret de signature des sessions (SEC-02). Lu dans l'environnement, jamais écrit dans le code :
 * l'ancien secret en dur est public (historique Git) et ne doit plus jamais être accepté.
 */
export function requireAuthSecret(env: Record<string, string | undefined> = process.env): string {
  const secret = env.AUTH_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET manquant ou trop court (32 caractères minimum) : l'application refuse de démarrer. " +
        'Générer une valeur avec `openssl rand -hex 32`.',
    )
  }
  return secret
}
