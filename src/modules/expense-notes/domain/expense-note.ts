// Domaine des notes de frais : aucune dépendance technique (règle dependency-cruiser `domaine-sans-infrastructure`).

export type ExpenseNoteStatus = 'pending' | 'approved' | 'rejected'

/** Catégories et plafonds par note, en euros (null : pas de plafond). */
const CATEGORY_CEILINGS = { transport: 500, repas: 30, hebergement: 150, autre: null } as const
export type Category = keyof typeof CATEGORY_CEILINGS
export type Decision = 'approved' | 'rejected'

export interface ExpenseNote {
  id: string
  userId: string
  amount: number
  expenseDate: string // AAAA-MM-JJ
  description: string
  receiptKey: string
  status: ExpenseNoteStatus
  category: Category
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
  category: Category
}

export function validateNewNote(input: {
  amount: unknown
  expenseDate: unknown
  description: unknown
  category?: unknown
}): NewExpenseNote | null {
  const amount = typeof input.amount === 'string' ? Number.parseFloat(input.amount) : Number.NaN
  if (!Number.isFinite(amount) || amount <= 0) return null
  if (typeof input.expenseDate !== 'string') return null
  if (typeof input.description !== 'string' || input.description.trim().length === 0) return null
  const category = input.category === undefined || input.category === null ? 'autre' : input.category
  // Object.hasOwn, pas `in` : `in` accepte aussi toString, __proto__… (relecture sécurité, répétition 2).
  if (typeof category !== 'string' || !Object.hasOwn(CATEGORY_CEILINGS, category)) return null
  const ceiling = CATEGORY_CEILINGS[category as Category]
  if (ceiling !== null && amount > ceiling) return null
  return { amount, expenseDate: input.expenseDate, description: input.description, category: category as Category }
}
