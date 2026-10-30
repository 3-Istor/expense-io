// Adaptateur HTTP commun aux routes : appelant courant, traduction des erreurs, formats JSON du contrat.
import { randomUUID } from 'node:crypto'
import { headers } from 'next/headers'
import { respondError } from '@/lib/errors'
import { log, withRequestId } from '@/lib/logger'
import { recordRequest } from '@/lib/metrics'
import type { ExpenseNoteJson } from '@/contract/schemas'
import { AppError, invalid, type AppErrorKind } from './app-error'
import { errorResponse, wantsProblem } from './problem'

/**
 * Code renvoyé à un appelant sans session ou sans le bon rôle. Le contrat actuel diffère selon les routes :
 * 401 pour les notes et les routes manager, 403 pour les routes RH (question ouverte aux profs, contrat gelé).
 */
export type DeniedStatus = 401 | 403

// Format des erreurs (ADR 0005) : `{ error }` en application/json par défaut, à l'identique ; RFC 9457
// (application/problem+json) quand le client le demande par `Accept`. Les clients existants ne voient aucune différence.
const STATUS: Record<Exclude<AppErrorKind, 'denied'>, number> = { invalid: 400, 'not-found': 404, conflict: 409 }

/**
 * Exécute une route : traduit les erreurs en codes du contrat, journalise une ligne par appel (opération, code, durée)
 * et compte l'appel dans les métriques RED exposées par /metrics (T-0021, hors contrat client). Source des SLI de
 * docs/slo.md.
 */
export async function handle(operation: string, deniedStatus: DeniedStatus, run: () => Promise<Response>): Promise<Response> {
  const clientRequestId = clientRequestIdFrom(await requestHeader('x-request-id'))
  return withRequestId(randomUUID(), () => handleInContext(operation, deniedStatus, run, clientRequestId))
}

async function handleInContext(
  operation: string,
  deniedStatus: DeniedStatus,
  run: () => Promise<Response>,
  clientRequestId: string | null,
): Promise<Response> {
  const started = performance.now()
  let response: Response
  try {
    response = await run()
  } catch (error) {
    const problem = wantsProblem(await requestHeader('accept'))
    if (error instanceof AppError) {
      const status = error.kind === 'denied' ? deniedStatus : STATUS[error.kind]
      const kind = error.kind === 'denied' ? (deniedStatus === 401 ? 'unauthenticated' : 'forbidden') : error.kind
      response = errorResponse(status, kind, error.message, { problem })
    } else {
      response = respondError(error, problem)
    }
  }
  const durationMs = Math.round(performance.now() - started)
  recordRequest(operation, response.status, durationMs)
  log(response.status >= 500 ? 'error' : 'info', 'requête API', {
    operation,
    status: response.status,
    durationMs,
    ...(clientRequestId ? { clientRequestId } : {}),
  })
  return response
}

/** En-tête de la requête en cours ; null hors requête (tests unitaires, scripts). */
async function requestHeader(name: string): Promise<string | null> {
  try {
    return (await headers()).get(name)
  } catch {
    return null
  }
}

const REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/

/**
 * Identifiant fourni par l'appelant (en-tête `x-request-id`), gardé seulement s'il a une forme sûre. Il est journalisé
 * à part (`clientRequestId`) : le `requestId` est toujours généré par le serveur, pour qu'un client ne puisse pas
 * réutiliser celui d'une autre requête et brouiller la corrélation. Aucune réponse ne change (contrat gelé).
 */
export function clientRequestIdFrom(header: string | null): string | null {
  return header && REQUEST_ID.test(header) ? header : null
}

/** Formulaire multipart ; un corps illisible ou d'un autre type est une entrée invalide (400), pas une panne (500). */
export async function readForm(request: Request): Promise<FormData> {
  try {
    return await request.formData()
  } catch {
    throw invalid()
  }
}

/** Reçu lu dans un formulaire multipart, ou null si le champ n'est pas un fichier. */
export function receiptFrom(value: FormDataEntryValue | null) {
  if (!(value instanceof File)) return null
  return { type: value.type, size: value.size, bytes: async () => Buffer.from(await value.arrayBuffer()) }
}

/** Forme JSON d'une note dans le contrat (docs/openapi.yaml, schéma ExpenseNote). */
export function noteJson(note: {
  id: string
  userId: string
  amount: number
  expenseDate: string
  description: string
  receiptKey: string
  status: string
  createdAt: Date
}): ExpenseNoteJson {
  return {
    id: note.id,
    userId: note.userId,
    amount: note.amount,
    expenseDate: note.expenseDate,
    description: note.description,
    receiptKey: note.receiptKey,
    status: note.status as ExpenseNoteJson['status'],
    createdAt: note.createdAt.toISOString(),
  }
}
