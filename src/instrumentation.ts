import { requireAuthSecret } from '@/lib/auth-secret'

// Exécuté une fois au démarrage du serveur : une configuration dangereuse arrête l'app avant la première requête.
export function register(): void {
  requireAuthSecret()
}
