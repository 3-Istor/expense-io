// Domaine des notes de frais : aucune dépendance technique (règle dependency-cruiser `domaine-sans-infrastructure`).

export type ExpenseNoteStatus = 'pending' | 'approved' | 'rejected'
export type Decision = 'approved' | 'rejected'

export interface ExpenseNote {
  id: string
  userId: string
  amount: number
  expenseDate: string // AAAA-MM-JJ
  description: string
  receiptKey: string
  status: ExpenseNoteStatus
  createdAt: Date
}

/** Machine à états : seule une note en attente peut être décidée, une seule fois, et jamais par son auteur. */
const TRANSITIONS: Record<ExpenseNoteStatus, readonly Decision[]> = {
  pending: ['approved', 'rejected'],
  approved: [],
  rejected: [],
}

export type DecisionRefusal = 'already-decided' | 'self-decision'

export function checkDecision(note: Pick<ExpenseNote, 'status' | 'userId'>, decision: Decision, actorId: string): DecisionRefusal | null {
  if (note.userId === actorId) return 'self-decision'
  if (!TRANSITIONS[note.status].includes(decision)) return 'already-decided'
  return null
}

// Bornes de la colonne amount numeric(10,2) : au-delà, la base refusait l'insertion (500, trouvé par analyse des
// cas limites du fuzzing). Une date doit être une vraie date du calendrier (2026-02-30 est refusée).
const MAX_AMOUNT = 99_999_999.99
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function isCalendarDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/** Champs saisis à la création, validés avant tout accès au stockage. */
export interface NewExpenseNote {
  amount: number
  expenseDate: string
  description: string
}

export function validateNewNote(input: { amount: unknown; expenseDate: unknown; description: unknown }): NewExpenseNote | null {
  const amount = typeof input.amount === 'string' ? Number.parseFloat(input.amount) : Number.NaN
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) return null
  if (typeof input.expenseDate !== 'string' || !isCalendarDate(input.expenseDate)) return null
  if (typeof input.description !== 'string' || input.description.trim().length === 0) return null
  return { amount, expenseDate: input.expenseDate, description: input.description }
}
