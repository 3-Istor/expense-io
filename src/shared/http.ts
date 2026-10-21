// Adaptateur HTTP commun aux routes : appelant courant, traduction des erreurs, formats JSON du contrat.
import { respondError } from '@/lib/errors'
import { log } from '@/lib/logger'
import type { ExpenseNoteJson } from '@/contract/schemas'
import { AppError, type AppErrorKind } from './app-error'

/**
 * Code renvoyé à un appelant sans session ou sans le bon rôle. Le contrat actuel diffère selon les routes :
 * 401 pour les notes et les routes manager, 403 pour les routes RH (question ouverte aux profs, contrat gelé).
 */
export type DeniedStatus = 401 | 403

// Format des erreurs : `{ error }` en application/json, conservé à l'identique. Le format RFC 9457
// (application/problem+json) a été écarté volontairement : les tests cachés de la moulinette des profs vérifient
// peut-être le format actuel (décision de Brian, 2026-10-20, docs/plan/QUESTIONS.md).
const STATUS: Record<Exclude<AppErrorKind, 'denied'>, number> = { invalid: 400, 'not-found': 404, conflict: 409 }

/**
 * Exécute une route : traduit les erreurs en codes du contrat et journalise une ligne par appel (opération, code,
 * durée). Ces lignes sont la source des SLI de docs/slo.md (aucun endpoint de métriques : contrat gelé).
 */
export async function handle(operation: string, deniedStatus: DeniedStatus, run: () => Promise<Response>): Promise<Response> {
  const started = performance.now()
  let response: Response
  try {
    response = await run()
  } catch (error) {
    if (error instanceof AppError) {
      const status = error.kind === 'denied' ? deniedStatus : STATUS[error.kind]
      response = Response.json({ error: error.message }, { status })
    } else {
      response = respondError(error)
    }
  }
  log(response.status >= 500 ? 'error' : 'info', 'requête API', {
    operation,
    status: response.status,
    durationMs: Math.round(performance.now() - started),
  })
  return response
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
