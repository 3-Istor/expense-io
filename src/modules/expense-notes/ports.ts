// Ports du module : ce dont les cas d'usage ont besoin, sans dire comment c'est fait.
import type { ApproverKind } from './domain/approvers'
import type { Decision, ExpenseNote, NewExpenseNote } from './domain/expense-note'
import type { Sort } from './domain/sort'

/** L'utilisateur qui appelle : chaque accès aux données se fait dans son contexte (isolation, SEC-05). */
export interface Caller {
  userId: string
}

export interface ExpenseNoteRepository {
  listOwn(caller: Caller, sort: Sort): Promise<ExpenseNote[]>
  findOwn(caller: Caller, noteId: string): Promise<ExpenseNote | null>
  reserveReceiptSeq(caller: Caller): Promise<number>
  insert(caller: Caller, note: NewExpenseNote & { receiptKey: string; receiptSeq: number }): Promise<ExpenseNote>
  listPendingInScope(caller: Caller, kind: ApproverKind): Promise<ExpenseNote[]>
  findInScope(caller: Caller, kind: ApproverKind, noteId: string): Promise<ExpenseNote | null>
  /** Écrit la décision seulement si la note est encore en attente (atomique, SEC-08) ; null sinon. */
  saveDecision(caller: Caller, kind: ApproverKind, noteId: string, decision: Decision): Promise<ExpenseNote | null>
}

export interface ReceiptStorage {
  upload(key: string, body: Buffer, contentType: string): Promise<void>
  signedUrl(key: string): Promise<string>
}

export interface ReceiptReader {
  suggest(receipt: { data: Buffer; mimeType: string }): Promise<{ amount?: number; expenseDate?: string }>
}
