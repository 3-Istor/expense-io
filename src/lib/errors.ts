import { randomUUID } from 'node:crypto'
import { errorResponse } from '@/shared/problem'
import { log } from './logger'

/**
 * Réponse à une erreur inattendue (SEC-07) : le détail (message SQL, stacktrace) reste dans les journaux du serveur,
 * le client reçoit un message générique et un identifiant pour retrouver l'erreur dans les journaux.
 */
export function respondError(error: unknown, problem = false): Response {
  const errorId = randomUUID()
  log('error', 'erreur inattendue', { errorId, error })
  // `stack` reste présent pour garder la forme du contrat (champs inchangés), mais toujours vide : la stacktrace ne
  // quitte plus le serveur. `errorId` est un champ ajouté (permis par le contrat).
  return errorResponse(500, 'internal', 'Erreur interne', { problem, extra: { errorId, stack: '' } })
}
