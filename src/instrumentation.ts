import { ensureAuthSecret } from '@/lib/auth-secret'

// Exécuté une fois au démarrage du serveur, avant la première requête : fixe le secret de session du processus.
export function register(): void {
  ensureAuthSecret()
}
