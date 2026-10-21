import { createHash, randomBytes } from 'node:crypto'

// Empreintes SHA-256 de secrets PUBLICS, donc sans valeur : l'ancien secret écrit dans le code (historique Git, SEC-02)
// et le texte d'exemple de .env.example. Seules les empreintes sont ici, pas les valeurs.
const PUBLIC_SECRET_HASHES = new Set([
  '99c7b7067e51ba5a9792598a0856cccd0d64be8f919108f641343c08e84c0b30', // secret en dur du commit d'origine 265924b
  '47cab39c15ad31493fd3fe39aa8dd9f1fbe0e6ac527087ee3a58e696d747efa4', // valeur d'exemple de .env.example
])

const isPublic = (secret: string) => PUBLIC_SECRET_HASHES.has(createHash('sha256').update(secret).digest('hex'))

/**
 * Secret de signature des sessions (SEC-02), jamais écrit dans le code.
 * - Valeur fournie et sûre : utilisée telle quelle.
 * - Absente, ou égale à une valeur publique connue : un secret aléatoire est généré pour ce processus, avec un
 *   avertissement. L'app marche sans configuration (moulinette, démo) ; les sessions sont perdues au redémarrage.
 * - Fournie mais trop courte : erreur de configuration explicite.
 * Le secret retenu est écrit dans `env.AUTH_SECRET` : tous les modules du processus voient le même.
 */
export function ensureAuthSecret(env: Record<string, string | undefined> = process.env): string {
  const secret = env.AUTH_SECRET?.trim()
  if (secret && !isPublic(secret)) {
    if (secret.length < 32) {
      throw new Error('AUTH_SECRET trop court (32 caractères minimum). Générer une valeur avec `openssl rand -hex 32`.')
    }
    return secret
  }
  const generated = randomBytes(32).toString('hex')
  env.AUTH_SECRET = generated
  console.warn(
    secret
      ? 'AUTH_SECRET est une valeur publique connue : remplacé par un secret aléatoire pour ce processus.'
      : 'AUTH_SECRET absent : secret aléatoire généré pour ce processus (sessions perdues au redémarrage). ' +
          'En production, fixer AUTH_SECRET (openssl rand -hex 32).',
  )
  return generated
}
