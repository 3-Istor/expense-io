// Adaptateur PostgreSQL du dépôt de notes. Toute requête passe par withUserScope : rôle `expense_app` soumis à la
// RLS et contexte de l'appelant (SEC-05). Requêtes constantes uniquement : aucun fragment venu du client (SEC-01).
import type { PoolClient } from 'pg'
import { withUserScope } from '@/lib/db'
import type { ApproverKind } from '../domain/approvers'
import type { Decision, ExpenseNote } from '../domain/expense-note'
import { SORTABLE_COLUMNS, type Sort } from '../domain/sort'
import type { ExpenseNoteRepository } from '../ports'

function toNote(row: Record<string, unknown>): ExpenseNote {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    amount: Number.parseFloat(row.amount as string),
    expenseDate: row.expense_date as string,
    description: row.description as string,
    receiptKey: row.receipt_key as string,
    status: row.status as ExpenseNote['status'],
    createdAt: new Date(row.created_at as string),
  }
}

const LIST_OWN_BY_SORT = new Map<string, string>(
  SORTABLE_COLUMNS.flatMap((column) =>
    (['ASC', 'DESC'] as const).map((direction) => [
      `${column} ${direction}`,
      `SELECT * FROM expense_notes WHERE user_id = $1 ORDER BY ${column} ${direction}`,
    ]),
  ),
)

// Périmètre des valideurs ($1 = appelant) : subordonnés directs pour un manager, managers racine de son entreprise
// pour un RH ; jamais ses propres notes (SEC-06).
const SCOPE: Record<ApproverKind, string> = {
  manager: 'u.manager_id = $1 AND en.user_id <> $1',
  hr: `u.role = 'manager' AND u.manager_id IS NULL AND en.user_id <> $1
       AND u.company_id = (SELECT company_id FROM users WHERE id = $1)`,
}
const PENDING_IN_SCOPE: Record<ApproverKind, string> = {
  manager: `SELECT en.* FROM expense_notes en JOIN users u ON u.id = en.user_id
            WHERE ${SCOPE.manager} AND en.status = 'pending' ORDER BY en.created_at ASC`,
  hr: `SELECT en.* FROM expense_notes en JOIN users u ON u.id = en.user_id
       WHERE ${SCOPE.hr} AND en.status = 'pending' ORDER BY en.created_at ASC`,
}
// Export borné (relecture sécurité : mémoire et pool de connexions) : les 10 000 notes les plus récentes au plus.
const ALL_IN_SCOPE: Record<ApproverKind, string> = {
  manager: `SELECT en.*, u.email AS author_email FROM expense_notes en JOIN users u ON u.id = en.user_id
            WHERE ${SCOPE.manager} ORDER BY en.created_at DESC LIMIT 10000`,
  hr: `SELECT en.*, u.email AS author_email FROM expense_notes en JOIN users u ON u.id = en.user_id
       WHERE ${SCOPE.hr} ORDER BY en.created_at DESC LIMIT 10000`,
}
const FIND_IN_SCOPE: Record<ApproverKind, string> = {
  manager: `SELECT en.* FROM expense_notes en JOIN users u ON u.id = en.user_id WHERE ${SCOPE.manager} AND en.id = $2`,
  hr: `SELECT en.* FROM expense_notes en JOIN users u ON u.id = en.user_id WHERE ${SCOPE.hr} AND en.id = $2`,
}
// Décision atomique et rebornée au périmètre (SEC-08) : écrite seulement si la note est encore en attente,
// avec sa trace (qui, quand).
const DECIDE_IN_SCOPE: Record<ApproverKind, string> = {
  manager: `UPDATE expense_notes en SET status = $3, decided_by = $1, decided_at = now() FROM users u
            WHERE u.id = en.user_id AND ${SCOPE.manager} AND en.id = $2 AND en.status = 'pending' RETURNING en.*`,
  hr: `UPDATE expense_notes en SET status = $3, decided_by = $1, decided_at = now() FROM users u
       WHERE u.id = en.user_id AND ${SCOPE.hr} AND en.id = $2 AND en.status = 'pending' RETURNING en.*`,
}

const first = (rows: Record<string, unknown>[]) => (rows[0] ? toNote(rows[0]) : null)

export const pgExpenseNoteRepository: ExpenseNoteRepository = {
  listOwn: (caller, sort: Sort) =>
    withUserScope(caller.userId, async (db: PoolClient) => {
      const query = LIST_OWN_BY_SORT.get(`${sort.column} ${sort.direction}`)!
      return (await db.query(query, [caller.userId])).rows.map(toNote)
    }),

  findOwn: (caller, noteId) =>
    withUserScope(caller.userId, async (db) =>
      first((await db.query('SELECT * FROM expense_notes WHERE id = $1 AND user_id = $2', [noteId, caller.userId])).rows),
    ),

  reserveReceiptSeq: (caller) =>
    withUserScope(caller.userId, async (db) =>
      Number((await db.query("SELECT nextval('expense_notes_receipt_seq_seq') AS seq")).rows[0].seq),
    ),

  insert: (caller, note) =>
    withUserScope(caller.userId, async (db) => {
      const res = await db.query(
        `INSERT INTO expense_notes (user_id, amount, expense_date, description, receipt_key, receipt_seq)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [caller.userId, note.amount, note.expenseDate, note.description, note.receiptKey, note.receiptSeq],
      )
      return toNote(res.rows[0])
    }),

  listPendingInScope: (caller, kind) =>
    withUserScope(caller.userId, async (db) => (await db.query(PENDING_IN_SCOPE[kind], [caller.userId])).rows.map(toNote)),

  listAllInScope: (caller, kind) =>
    withUserScope(caller.userId, async (db) =>
      (await db.query(ALL_IN_SCOPE[kind], [caller.userId])).rows.map((row) => ({
        ...toNote(row),
        authorEmail: row.author_email as string,
      })),
    ),

  findInScope: (caller, kind, noteId) =>
    withUserScope(caller.userId, async (db) => first((await db.query(FIND_IN_SCOPE[kind], [caller.userId, noteId])).rows)),

  saveDecision: (caller, kind, noteId, decision: Decision) =>
    withUserScope(caller.userId, async (db) =>
      first((await db.query(DECIDE_IN_SCOPE[kind], [caller.userId, noteId, decision])).rows),
    ),
}
