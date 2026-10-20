import { randomUUID } from 'node:crypto'

/**
 * Réponse à une erreur inattendue (SEC-07) : le détail (message SQL, stacktrace) reste dans les journaux du serveur,
 * le client reçoit un message générique et un identifiant pour retrouver l'erreur dans les journaux.
 */
export function respondError(error: unknown): Response {
  const errorId = randomUUID()
  console.error(`[erreur ${errorId}]`, error)
  return Response.json({ error: 'Erreur interne', errorId }, { status: 500 })
}
