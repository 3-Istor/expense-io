// Adaptateur HTTP commun aux routes : appelant courant, traduction des erreurs, formats JSON du contrat.
import { respondError } from '@/lib/errors'
import { AppError, type AppErrorKind } from './app-error'

/**
 * Code renvoyé à un appelant sans session ou sans le bon rôle. Le contrat actuel diffère selon les routes :
 * 401 pour les notes et les routes manager, 403 pour les routes RH (question ouverte aux profs, contrat gelé).
 */
export type DeniedStatus = 401 | 403

const STATUS: Record<Exclude<AppErrorKind, 'denied'>, number> = { invalid: 400, 'not-found': 404, conflict: 409 }

export async function handle(deniedStatus: DeniedStatus, run: () => Promise<Response>): Promise<Response> {
  try {
    return await run()
  } catch (error) {
    if (error instanceof AppError) {
      const status = error.kind === 'denied' ? deniedStatus : STATUS[error.kind]
      return Response.json({ error: error.message }, { status })
    }
    return respondError(error)
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
}) {
  return {
    id: note.id,
    userId: note.userId,
    amount: note.amount,
    expenseDate: note.expenseDate,
    description: note.description,
    receiptKey: note.receiptKey,
    status: note.status,
    createdAt: note.createdAt.toISOString(),
  }
}
