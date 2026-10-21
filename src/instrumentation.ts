// Exécuté une fois au démarrage du serveur, avant la première requête : fixe le secret de session du processus.
// Next compile aussi ce fichier pour le runtime Edge, sans node:crypto : on ne charge le code que côté Node.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureAuthSecret } = await import('@/lib/auth-secret')
    ensureAuthSecret()
  }
}
