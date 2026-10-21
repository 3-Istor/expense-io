import type { PoolClient } from 'pg'
import { auth } from '@/lib/auth'
import { withUserScope } from '@/lib/db'
import { respondError } from '@/lib/errors'
import { toExpenseNote } from '@/lib/expense-note-dto'
import { getReceiptUrl } from '@/lib/storage'

/**
 * Règles d'accès des valideurs, en un seul endroit :
 * - un manager agit sur les notes de ses subordonnés directs ;
 * - un RH agit sur les notes des managers racine (sans manager) de SON entreprise.
 * Chaque route les applique elle-même (AGENTS.md) : aucune ne suppose qu'une autre a déjà filtré.
 */
export type Approver = 'manager' | 'hr'

const APPROVER_ROLE: Record<Approver, { role: string; deniedStatus: number }> = {
  // Codes de refus du contrat actuel, conservés tels quels (401 côté manager, 403 côté RH).
  manager: { role: 'manager', deniedStatus: 401 },
  hr: { role: 'hr_admin', deniedStatus: 403 },
}

// Requêtes complètes et constantes (aucun fragment interpolé) : $1 = note, $2 = appelant.
// `en.user_id <> $2` : personne ne décide de sa propre note, même si une règle de périmètre changeait (SEC-06).
const SCOPED_NOTE_QUERY: Record<Approver, string> = {
  manager: `SELECT en.* FROM expense_notes en
            JOIN users u ON u.id = en.user_id
            WHERE en.id = $1 AND u.manager_id = $2 AND en.user_id <> $2`,
  hr: `SELECT en.* FROM expense_notes en
       JOIN users u ON u.id = en.user_id
       WHERE en.id = $1 AND u.role = 'manager' AND u.manager_id IS NULL AND en.user_id <> $2
         AND u.company_id = (SELECT company_id FROM users WHERE id = $2)`,
}

/** La note `noteId` si elle est dans le périmètre de l'appelant, sinon undefined. */
async function findScopedNote(client: PoolClient, approver: Approver, noteId: string, userId: string) {
  const result = await client.query(SCOPED_NOTE_QUERY[approver], [noteId, userId])
  return result.rows[0] as Record<string, unknown> | undefined
}

type Params = { params: Promise<{ id: string }> }

async function authorize(approver: Approver): Promise<{ denied: Response } | { userId: string }> {
  const session = await auth()
  const { role, deniedStatus } = APPROVER_ROLE[approver]
  if (!session?.user || session.user.role !== role) {
    return { denied: Response.json({ error: 'Unauthorized' }, { status: deniedStatus }) }
  }
  return { userId: session.user.id }
}

/** Handler POST d'une décision (approve ou reject) pour un type de valideur. */
export function decisionHandler(approver: Approver, decision: 'approved' | 'rejected') {
  return async function POST(_request: Request, { params }: Params): Promise<Response> {
    try {
      const caller = await authorize(approver)
      if ('denied' in caller) return caller.denied
      const { id } = await params
      return await withUserScope(caller.userId, async (client) => {
        const note = await findScopedNote(client, approver, id, caller.userId)
        if (!note) return Response.json({ error: 'Not found' }, { status: 404 })
        // Décision atomique (SEC-08) : la condition sur le statut est dans l'UPDATE. Deux décisions simultanées
        // ne peuvent pas réussir toutes les deux : la seconde attend le verrou de ligne, puis ne trouve plus de note
        // en attente.
        const updated = await client.query(
          "UPDATE expense_notes SET status = $2 WHERE id = $1 AND status = 'pending' RETURNING *",
          [id, decision],
        )
        if (updated.rowCount === 0) return Response.json({ error: 'Already decided' }, { status: 409 })
        return Response.json(toExpenseNote(updated.rows[0]))
      })
    } catch (error) {
      return respondError(error)
    }
  }
}

/** Handler GET de l'URL signée d'un reçu, dans le périmètre du valideur (SEC-03). */
export function receiptUrlHandler(approver: Approver) {
  return async function GET(_request: Request, { params }: Params): Promise<Response> {
    try {
      const caller = await authorize(approver)
      if ('denied' in caller) return caller.denied
      const { id } = await params
      const note = await withUserScope(caller.userId, (client) => findScopedNote(client, approver, id, caller.userId))
      if (!note) return Response.json({ error: 'Not found' }, { status: 404 })
      return Response.json({ url: await getReceiptUrl(note.receipt_key as string) })
    } catch (error) {
      return respondError(error)
    }
  }
}
