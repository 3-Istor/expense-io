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

/** Champs saisis à la création, validés avant tout accès au stockage. */
export interface NewExpenseNote {
  amount: number
  expenseDate: string
  description: string
}

export function validateNewNote(input: { amount: unknown; expenseDate: unknown; description: unknown }): NewExpenseNote | null {
  const amount = typeof input.amount === 'string' ? Number.parseFloat(input.amount) : NaN
  if (!Number.isFinite(amount) || amount <= 0) return null
  if (typeof input.expenseDate !== 'string') return null
  if (typeof input.description !== 'string' || input.description.trim().length === 0) return null
  return { amount, expenseDate: input.expenseDate, description: input.description }
}
